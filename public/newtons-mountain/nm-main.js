// Newton's Mountain: boot, renderer, XR session (VR and passthrough AR), input, frame loop. Page glue is nm-page-ui.js.
// Reuses the Night Sky shell: ns-input (attachDesktop, XRInput), ns-orient (phone look-around), the VRPanel placement code,
// the star layer and catalog. The Night Sky and this module share no state.
import * as THREE from "../vendor/three/three.module.min.js";
import { loadCatalog } from "../night-sky/ns-catalog.js";
import { XRInput } from "../night-sky/ns-input.js";
import { createOrientationFilter, mergeOrientationSample, screenAngleDeg, preferredXrMode, isPassthroughBlend } from "../night-sky/ns-orient.js";
import { loadPanelAssets } from "../night-sky/ns-vrpanel.js";
import { NM_CONFIG as C } from "./nm-config.js";
import { parseQuery, serialize, reduce, bracket as bracketOf } from "./nm-state.js";
import { consts as constsOf, makeShot, stepShot, smartPace, stepsFor, altitudeNow, lapsNow, groundDistanceNow, outcomeOf, fallCheck, derived, gAt } from "./nm-sim.js";
import { loadDensity, ballistic } from "./nm-atmos.js";
import { mountainFrame, modelFrame, planeAxes, raySphere } from "./nm-frames.js";
import { createWorld } from "./nm-scene.js";
import { ShotViz, ArrowViz, hiddenByEarth } from "./nm-trails.js";
import { NMPanel, TABS, PAGES } from "./nm-vrpanel.js";
import { pickNearest, rayPointDistance } from "./nm-pick.js";
import * as S from "./nm-strings.js";

const DESKTOP_FOV = 70;
const reduced = () => typeof matchMedia !== "undefined" && matchMedia("(prefers-reduced-motion: reduce)").matches;

export async function boot({ canvas, onState = () => {}, onStatus = () => {}, onXr = () => {}, onFrameStats = () => {}, query = location.search }) {
  let state = parseQuery(query);
  const baseUrl = new URL("./", import.meta.url), nsBase = new URL("../night-sky/", import.meta.url), siteBase = new URL("../", import.meta.url);
  onStatus("Loading stars...");
  const [catalog, rho] = await Promise.all([loadCatalog(new URL("data/", nsBase).href), loadDensity(new URL("data/ussa76-density-5km.json", baseUrl).href)]);
  const icons = await loadPanelAssets(nsBase);

  const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, powerPreference: "high-performance" });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
  renderer.xr.enabled = true; renderer.xr.setReferenceSpaceType("local-floor"); renderer.xr.setFramebufferScaleFactor(1.0);
  const world = createWorld(THREE, { catalog, renderer, assetBase: siteBase });
  const { scene, far } = world;
  const camera = new THREE.PerspectiveCamera(DESKTOP_FOV, 1, 0.05, 1e9); camera.rotation.order = "YXZ"; scene.add(camera);
  const EYE = [0, 1.6, 0];
  const viz = new ShotViz(THREE, far, scene);
  const velArrow = new ArrowViz(THREE, far, scene, 0x7fd0ff, "#bfe8ff"), gravArrow = new ArrowViz(THREE, far, scene, 0xffb36b, "#ffd9b0");
  const panel = new NMPanel(THREE, icons); scene.add(panel.mesh);

  // ---- run state (not in the URL) ----
  const sims = new Map(); // n -> { rec, sim, it, params }
  let accum = 0, autoWarp = 1, rampT = 99, xrSession = null, arActive = false, prevView = null, freeze = 0, xrSupported = false, arSupported = false, seeRoom = false;
  let modelCentre = [0, 1.25, -1.0], orbit = { yaw: 0.35, pitch: 1.0, dist: 3.6 }, view = { yaw: -0.5, pitch: -0.06, fovDeg: DESKTOP_FOV };
  const look = { active: false, mode: "relative", note: "", hasSample: false, offsetYaw: 0, offsetPitch: 0, sample: null }, oriFilter = createOrientationFilter();
  let panelDirty = true, lastPanelDraw = 0, hitTest = { source: null, ok: false, pose: null }, reticle = null, placePending = false, selectedShape = null;
  const c = () => C.CONSTS[state.consts];
  const hM = () => state.h * 1e3;
  const sizeCm = () => state.size || (arActive ? C.sizeArDefault : C.sizeVrDefault);

  function applyFrame() {
    const R = c().R, h = hM();
    const fr = state.view === "mountain" ? mountainFrame(C.rig, R, h) : modelFrame(modelCentre, sizeCm() / 100, R);
    world.setFrame(fr, R, h, { rings: state.rings });
    viz.setFrame(fr, R, h);
    world.setLaunchCard(S.launchCard(state.vel));
    panelDirty = true; return fr;
  }

  // ---- firing and the shot list ----
  function paramsOf(rec) {
    const cc = C.CONSTS[rec.consts];
    return { GM: cc.GM, R: cc.R, h: rec.h * 1e3, v: rec.v, drag: rec.air ? { rho, beta: ballistic({ ...C.ball, massKg: rec.mass }) } : null, gdial: rec.gdial };
  }
  function syncShots() { // drop sims whose records were removed from the state (9th shot, clear, height change)
    for (const n of [...sims.keys()]) if (!state.fired.some((f) => f.n === n)) { viz.remove(n); sims.delete(n); }
  }
  function startShot(rec) {
    const params = paramsOf(rec), sim = makeShot(params);
    const it = viz.add(rec.n, sim, C.palette[(rec.n - 1) % C.palette.length]);
    sims.set(rec.n, { rec, sim, it, params, ended: false });
    viz.highlight(state.selected); viz.setTrailVisible(state.trail);
    return sims.get(rec.n);
  }
  function fire(v) {
    const before = state;
    if (v !== undefined) state = { ...reduce({ ...state, vel: v, lock: [] }, { type: "fire" }), vel: before.vel, lock: before.lock };
    else state = reduce(state, { type: "fire" });
    syncShots();
    const rec = state.fired[state.fired.length - 1], s = startShot(rec);
    if (v === undefined) {
      if (state.warp === "auto") { autoWarp = smartPace(s.params).warp; state = reduce(state, { type: "setWarpNow", w: autoWarp }); }
      rampT = reduced() ? 99 : 0; if (state.paused) state = reduce(state, { type: "setPaused", on: false });
      haptic(0, 0.5, 40);
    }
    return s;
  }
  function finish(e) { // a shot just ended
    const { sim, it, rec } = e; e.ended = true; viz.record(it, sim.x, sim.y, true);
    panelDirty = true;
    if (sim.status === "landed") { viz.land(it, S.flagText(rec.n, rec.v, sim.landing.range, sim.landing.t), sim.x, sim.y); state = reduce(state, { type: "result", n: rec.n, landed: true }); haptic(0, 0.25, 25); }
    else { viz.retire(it); state = reduce(state, { type: "result", n: rec.n, landed: false }); }
    onState(state);
  }
  function stepAll(n) {
    for (const e of sims.values()) {
      if (e.ended) continue;
      const { sim, it } = e; sim.gdial = state.gdial;
      for (let k = 0; k < n && sim.status === "flying"; k++) { stepShot(sim); viz.record(it, sim.x, sim.y); }
      if (sim.status !== "flying") finish(e);
      else {
        viz.setBall(it, sim.x, sim.y);
        if (sim.lapped && state.results[e.rec.n] === null) { state = reduce(state, { type: "result", n: e.rec.n, landed: false }); panelDirty = true; onState(state); }
      }
    }
  }
  /** Advance the sim by wall seconds at the current warp; used by the frame loop and by tests (stepSeconds). */
  function advance(wallDt) {
    if ([...sims.values()].every((e) => e.ended)) return;
    let warp = state.paused || freeze > 0 ? 0 : state.warp === "auto" ? autoWarp : state.warp;
    if (warp && state.warp === "auto" && rampT < 3) warp = Math.pow(warp, Math.max(0.0001, rampT / 3)); // B10: ease from 1x to the target over 3 s
    rampT += wallDt;
    const r = stepsFor(accum, warp, wallDt); accum = r.accum; if (r.n) stepAll(r.n);
  }

  // ---- state ----
  let urlTimer = 0;
  function dispatch(a, opt = {}) {
    if (a.type === "_page") { const n = panel.pageCount(panel.tab); panel.page[panel.tab] = (panel.page[panel.tab] + a.d + n) % n; panelDirty = true; return state; }
    if (a.type === "_rows") { panel.shotRow = Math.max(0, panel.shotRow + a.d); panelDirty = true; return state; }
    if (a.type === "_place") { placeModel(); return state; }
    if (a.type === "_ring") { const s = new Set(state.rings); s.has(a.ring) ? s.delete(a.ring) : s.add(a.ring); a = { type: "setRings", rings: [...s] }; }
    if (a.type === "fire") { fire(); notify(); return state; }
    const before = state; state = reduce(state, a);
    if (state === before) return state;
    if (a.type === "setHeight" || a.type === "clear") { syncShots(); accum = 0; }
    if (a.type === "setHeight") applyFrame();
    if (a.type === "setView" || a.type === "toggleView" || a.type === "setRings" || a.type === "setSize") { if (state.view !== before.view && arActive) { state = { ...state, view: "model" }; } applyFrame(); }
    if (a.type === "toggle" && a.key === "trail") viz.setTrailVisible(state.trail);
    if (a.type === "select") viz.highlight(state.selected);
    if (a.type === "speedStep" || a.type === "setSpeed") world.setLaunchCard(S.launchCard(state.vel));
    if (a.type === "pauseToggle" || a.type === "warpStep" || a.type === "warpAuto") { if (a.type === "warpAuto") { const live = [...sims.values()].find((e) => !e.ended); if (live) autoWarp = smartPace(live.params).warp; state = reduce(state, { type: "setWarpNow", w: autoWarp }); } }
    notify(opt); return state;
  }
  function notify(opt = {}) { panelDirty = true; clearTimeout(urlTimer); urlTimer = setTimeout(syncUrl, opt.quiet ? 400 : 60); onState(state); }
  function syncUrl() { const q = serialize(state); try { history.replaceState(history.state, "", q ? "?" + q : location.pathname); } catch {} }

  // ---- panel model (the headset canvas and the HTML page both read this) ----
  const fmtKmAlt = (m) => `${(m / 1e3).toFixed(1)} km`;
  /** Explain level only: the fall check, from the spec's own wording. Empty at help 0 and 1 and once the shot has ended. */
  function levelTwoLines(sim) {
    if (state.help < 2 || sim.status !== "flying") return [];
    const r = Math.hypot(sim.x, sim.y), fc = fallCheck({ GM: sim.GM * sim.gdial / 100, R: sim.R }, r, sim.speedNow);
    return [`The ball falls this far below a straight line: ${fc.fall.toFixed(3)} m in 1 s`, `Earth's surface curves away this far: ${fc.curve.toFixed(3)} m` + (fc.match ? "   They match." : "")];
  }
  function liveDetail(sim, rec, full) {
    const lines = [S.resultLine(rec, sim, state.help, c())];
    const laps = lapsNow(sim);
    lines.push(`Flight time ${S.fmtDuration(sim.t)}   Altitude ${fmtKmAlt(altitudeNow(sim))}`);
    lines.push(`Speed ${(sim.speedNow / 1000).toFixed(2)} km/s   Laps ${laps.toFixed(1)}`);
    lines.push(`Lowest ${fmtKmAlt(sim.status === "landed" ? 0 : sim.minR - sim.R)}   Highest ${fmtKmAlt(sim.maxR - sim.R)}`);
    if (full) lines.push(`Distance along the ground ${S.fmtKm(groundDistanceNow(sim))}   Angle swept ${(sim.swept * 180 / Math.PI).toFixed(0)}°`);
    lines.push(...levelTwoLines(sim));
    return lines;
  }
  function model() {
    const sel = sims.get(state.selected) || [...sims.values()].pop();
    const rows = state.fired.map((f) => { const e = sims.get(f.n), o = e ? outcomeOf(e.sim) : "flying"; return { n: f.n, color: C.palette[(f.n - 1) % C.palette.length], speed: S.fmtSpeed(f.v), state: o === "landed" ? "landed" : o === "left" ? "left" : o === "flying-lap" ? "lapped" : "flying" }; });
    const b = S.bracketLines(bracketOf(state));
    const ws = state.warp === "auto" ? autoWarp : state.warp;
    return { speed: state.vel, paused: state.paused, warpAuto: state.warp === "auto", warpLabel: state.warp === "auto" ? `Auto ${state.warpNow}x` : `${state.warp}x`, view: state.view, h: state.h, lock: state.lock, rows, selected: sel ? sel.rec.n : null,
      detail: sel ? liveDetail(sel.sim, sel.rec, false).slice(0, 5) : [], detailFull: sel ? liveDetail(sel.sim, sel.rec, true) : [], levelTwo: sel ? levelTwoLines(sel.sim) : [], bracket: [b.landed, b.notLanded], between: S.betweenShots(bracketOf(state), state.help, derived(c(), hM()).vCirc),
      trail: state.trail, velvec: state.velvec, gravec: state.gravec, air: state.air, mass: state.mass, gdial: state.gdial, rings: state.rings, sizes: arActive ? C.sizeAr : C.sizeVr, size: sizeCm(),
      help: state.help, helpLines: S.helpLines(state.help, c(), hM()), inAR: arActive, canPlace: arActive, ui: state.ui, warpValue: ws, launchCard: S.launchCard(state.vel) };
  }

  // ---- view and camera ----
  function headWorld() {
    if (renderer.xr.isPresenting) { const x = renderer.xr.getCamera(); return new THREE.Vector3().setFromMatrixPosition(x.matrixWorld); }
    return camera.position;
  }
  function applyCamera(dt) {
    if (renderer.xr.isPresenting) return;
    if (state.view === "mountain") {
      camera.position.set(...EYE);
      if (look.active) {
        const s = look.sample; if (s && s.alpha != null) oriFilter.push(s.alpha, s.beta, s.gamma, s.screen, s.compassAlpha); oriFilter.tick(dt || 1 / 60);
        if (oriFilter.quaternion) { look.hasSample = true; const q = oriFilter.quaternion; camera.quaternion.set(q.x, q.y, q.z, q.w); camera.quaternion.multiply(new THREE.Quaternion().setFromEuler(new THREE.Euler(look.offsetPitch, look.offsetYaw, 0, "YXZ"))); return; }
      }
      camera.rotation.set(view.pitch, view.yaw, 0);
    } else {
      const az = -orbit.yaw, el = orbit.pitch, d = orbit.dist * (sizeCm() / 100) * 0.5;
      camera.position.set(modelCentre[0] + d * Math.sin(az) * Math.cos(el), modelCentre[1] + d * Math.sin(el), modelCentre[2] + d * Math.cos(az) * Math.cos(el));
      camera.lookAt(modelCentre[0], modelCentre[1], modelCentre[2]);
    }
  }
  function resize() { const w = canvas.clientWidth || 1, h = canvas.clientHeight || 1; renderer.setSize(w, h, false); camera.aspect = w / h; camera.fov = w / h < 1 ? 84 : DESKTOP_FOV; camera.updateProjectionMatrix(); }
  new ResizeObserver(resize).observe(canvas); resize();

  // ---- XR ----
  const gpOf = (i) => xrInput.ctrl[i].source && xrInput.ctrl[i].source.gamepad;
  function haptic(i, power, ms) { try { const gp = xrInput && xrInput.ctrl[i] && gpOf(i), ha = gp && gp.hapticActuators && gp.hapticActuators[0]; if (ha && ha.pulse) ha.pulse(power, ms).catch(() => {}); } catch {} }
  const hand = (i) => (xrInput.ctrl[i].source && xrInput.ctrl[i].source.handedness) || (i === 0 ? "left" : "right");
  const stick = [{ dir: 0, t: 0 }, { dir: 0, t: 0 }, { dir: 0, t: 0 }, { dir: 0, t: 0 }]; // per hand: vertical repeat state; [2],[3] horizontal
  let xHold = { i: -1, t: 0 }, activeHand = 0;
  const xrInput = new XRInput(THREE, renderer, scene, {
    onHover(i, ray) {
      const ph = panel.intersect(ray), id = ph && ph.hit ? ph.hit.id : null;
      if (panel.drag && panel.drag.ctrl === i && panel.drag.kind === "panel") { panel.updateDrag(ray, renderer.xr.getCamera()); return; }
      if (id !== panel.hover && i === activeHand) { panel.hover = id; panelDirty = true; } if (ph) activeHand = i;
      xrInput.setRayLength(i, ph ? ph.dist : 5);
    },
    onSelectStart(i, ray) {
      const ph = panel.intersect(ray);
      if (ph) { const h = ph.hit; if (!h) return; if (h.drag) panel.drag = { kind: "panel", ctrl: i, dist: ph.dist }; else if (h.tab) tabPress(h.tab); else if (h.action) press(i, h); return; }
      const o = [ray.origin.x, ray.origin.y, ray.origin.z], d = [ray.dir.x, ray.dir.y, ray.dir.z];
      if (state.view === "mountain" && rig().visible && rayPointDistance(o, d, [world.fireBtnWorld.x, world.fireBtnWorld.y, world.fireBtnWorld.z]) < 0.12) { dispatch({ type: "fire" }); return; }
      if (arActive && (hitTest.ok && hitTest.pose || !hitTest.ok)) { placeAtHit(); return; }
      const n = pickShotRay(o, d); if (n != null) dispatch({ type: "select", n });
    },
    onSelectEnd(i) { if (panel.drag && panel.drag.ctrl === i) { panel.drag = null; panelDirty = true; } },
    onScrubHours() {},
    onTogglePanel() { panel.mesh.visible = !panel.mesh.visible; if (panel.mesh.visible) { panel.placeInFront(renderer.xr.getCamera()); panelDirty = true; } },
    onSqueeze(i, down) { freeze = Math.max(0, freeze + (down ? 1 : -1)); },
    onButton(i, b, down) {
      const right = hand(i) === "right";
      if (b === 4 && right && down) dispatch({ type: "fire" });                       // A
      if (b === 4 && !right) xHold = down ? { i, t: 0 } : { i: -1, t: 0 };            // X: hold 1 s to clear
      if (b === 3 && down) dispatch(right ? { type: "toggleView" } : { type: "pauseToggle" }); // stick presses
    },
    onAxes(i, axes, dt) {
      const right = hand(i) === "right", y = axes.length >= 4 ? axes[3] : 0, x = axes.length >= 4 ? axes[2] : 0, st = stick[right ? 1 : 0];
      const dir = Math.abs(y) > 0.6 ? (y < 0 ? 1 : -1) : 0; // stick up raises the speed
      if (dir !== st.dir) { st.dir = dir; st.t = 0; if (dir) dispatch({ type: "speedStep", delta: dir * (right ? C.fineStep : C.coarseStep) }, { quiet: true }); }
      else if (dir) { st.t += dt; if (st.t > 0.35) { st.t -= 1 / 6; dispatch({ type: "speedStep", delta: dir * (right ? C.fineStep : C.coarseStep) }, { quiet: true }); } }
      if (!right) { const hs = stick[2], hd = Math.abs(x) > 0.6 ? (x > 0 ? 1 : -1) : 0; if (hd !== hs.dir) { hs.dir = hd; if (hd) dispatch({ type: "warpStep", dir: hd }); } }
    },
  }, { scrub: false });
  const rig = () => world.rig;
  function tabPress(tab) { if (panel.tab === tab && panel.pageCount(tab) > 1) panel.page[tab] = (panel.page[tab] + 1) % panel.pageCount(tab); else panel.tab = tab; panelDirty = true; }
  function press(i, h) { panel.pressed = h.id; panelDirty = true; setTimeout(() => { if (panel.pressed === h.id) { panel.pressed = null; panelDirty = true; } }, 150); haptic(i, 0.4, 15); dispatch(h.action); }
  function pickShotRay(o, d) {
    const pts = [];
    for (const e of sims.values()) {
      const it = e.it, n = e.rec.n;
      if (!it.landed) pts.push({ n, p: viz.worldOf(e.sim.x, e.sim.y) }); else if (it.flagWorld) pts.push({ n, p: it.flagWorld });
      const step = Math.max(1, Math.floor(it.buf.n / 160)); for (let k = 0; k < it.buf.n; k += step) pts.push({ n, p: viz.worldOf(it.buf.x(k), it.buf.y(k)) });
    }
    const vis = pts.filter((q) => !hiddenByEarth(far, q.p));
    return pickNearest(vis, o, d, 3);
  }
  function placeModel(pos) {
    const cam = renderer.xr.isPresenting ? renderer.xr.getCamera() : camera, p = new THREE.Vector3().setFromMatrixPosition(cam.matrixWorld), f = new THREE.Vector3(0, 0, -1).transformDirection(cam.matrixWorld); f.y = 0; if (f.lengthSq() < 1e-6) f.set(0, 0, -1); f.normalize();
    modelCentre = pos || (arActive ? [p.x + f.x * 0.6, p.y - 0.3, p.z + f.z * 0.6] : [p.x + f.x * 0.9, p.y - 0.25, p.z + f.z * 0.9]);
    if (state.view === "model") applyFrame();
  }
  function placeAtHit() {
    if (hitTest.ok && hitTest.pose) { const p = hitTest.pose.transform.position, onFloor = p.y < 0.3; placeModel([p.x, p.y + (onFloor ? 1.1 : 0.2), p.z]); } else placeModel();
  }

  const arOverlay = typeof document !== "undefined" ? document.getElementById("arOverlay") : null;
  if (navigator.xr && navigator.xr.isSessionSupported) {
    try { xrSupported = await navigator.xr.isSessionSupported("immersive-vr"); } catch {}
    try { arSupported = await navigator.xr.isSessionSupported("immersive-ar"); } catch {}
  }
  const emitXr = (presenting, mode) => onXr({ supported: xrSupported, presenting: !!presenting, arSupported, mode: mode || null, seeRoom, hitTest: hitTest.ok });
  function onSessionEnd() {
    xrSession = null; if (hitTest.source) { try { hitTest.source.cancel(); } catch {} } hitTest = { source: null, ok: false, pose: null };
    if (reticle) reticle.visible = false; panel.mesh.visible = false; scene.background = new THREE.Color(0x000000); renderer.setClearAlpha(1);
    const wasAr = arActive; arActive = false; if (wasAr && prevView) { state = { ...state, view: prevView }; prevView = null; }
    applyFrame(); emitXr(false); onState(state);
  }
  async function startSession(mode) {
    if (!navigator.xr || !mode) return;
    if (xrSession) { const old = xrSession; xrSession = null; old.removeEventListener("end", onSessionEnd); try { await old.end(); } catch {} try { await renderer.xr.setSession(null); } catch {} onSessionEnd(); }
    const optional = mode === "immersive-ar" ? ["local-floor", "bounded-floor", "hit-test", "dom-overlay"] : ["local-floor", "bounded-floor", "hand-tracking"];
    const init = { optionalFeatures: optional }; if (mode === "immersive-ar" && arOverlay) init.domOverlay = { root: arOverlay };
    try {
      const session = await navigator.xr.requestSession(mode, init); xrSession = session; session.addEventListener("end", onSessionEnd);
      arActive = mode === "immersive-ar";
      if (arActive) { scene.background = null; renderer.setClearAlpha(0); prevView = state.view; state = { ...state, view: "model" }; }
      await renderer.xr.setSession(session);
      if (arActive) await setupHitTest(session);
    } catch (err) { xrSession = null; arActive = false; emitXr(false); throw err; }
    panel.mesh.visible = state.ui; panelDirty = true; placePending = true; applyFrame(); emitXr(true, mode); onState(state);
  }
  async function setupHitTest(session) {
    hitTest = { source: null, ok: false, pose: null };
    try {
      if (session.enabledFeatures && !session.enabledFeatures.includes("hit-test")) return;
      const viewer = await session.requestReferenceSpace("viewer"); hitTest.source = await session.requestHitTestSource({ space: viewer }); hitTest.ok = !!hitTest.source;
      if (hitTest.ok && !reticle) { reticle = new THREE.Mesh(new THREE.RingGeometry(0.06, 0.08, 32).rotateX(-Math.PI / 2), new THREE.MeshBasicMaterial({ color: 0xcfe6ff, transparent: true, opacity: 0.9, depthTest: false })); reticle.renderOrder = 50; reticle.visible = false; reticle.matrixAutoUpdate = false; scene.add(reticle); }
    } catch { hitTest = { source: null, ok: false, pose: null }; } // unsupported: no reticle, the globe is placed in front of the head
  }
  async function setSeeRoom(on) {
    seeRoom = !!on && arSupported;
    if (xrSession) { const want = preferredXrMode(seeRoom, xrSupported, arSupported); if (want && want !== xrSession.mode) return startSession(want); emitXr(true, xrSession.mode); return; }
    emitXr(false);
  }

  // ---- phone look-around (Mountain view only) ----
  function setLookAround(on) {
    if (on) { Object.assign(look, { active: true, hasSample: false, mode: "relative", note: "", offsetYaw: 0, offsetPitch: 0, sample: null }); oriFilter.reset(); }
    else { look.active = false; look.hasSample = false; look.note = ""; look.sample = null; oriFilter.reset(); }
    return look;
  }
  function ingestOrientation(ev, screenDeg) { const s = mergeOrientationSample(look.sample, ev, screenDeg != null ? screenDeg : screenAngleDeg()); look.sample = s; look.mode = s.mode; look.note = s.note; return look; }

  // ---- frame loop ----
  function updateHands() {
    const a = far.uHandA.value, b = far.uHandB.value; a.set(0, -99, 0); b.set(0, -99, 0);
    if (!renderer.xr.isPresenting) return;
    xrInput.ctrl.forEach((st, i) => { if (st.source) (i === 0 ? a : b).setFromMatrixPosition(st.c.matrixWorld); });
  }
  let last = performance.now(), frames = 0, statT = last, worst = 0, stats = { text: "" }, lastDetail = 0;
  renderer.setAnimationLoop((now, xrFrame) => {
    const dt = Math.min(0.1, (now - last) / 1000); worst = Math.max(worst, now - last); last = now;
    const xr = renderer.xr.isPresenting;
    advance(dt);
    if (xrInput && xr) { if (placePending) { placeModel(); panel.placeInFront(renderer.xr.getCamera()); placePending = false; } xrInput.update(dt); if (xHold.i >= 0) { xHold.t += dt; if (xHold.t >= 1) { dispatch({ type: "clear" }); xHold = { i: -1, t: 0 }; haptic(0, 0.6, 60); } } }
    applyCamera(dt); camera.updateMatrixWorld(true);
    const cam = xr ? renderer.xr.getCamera() : camera;
    const head = xr ? new THREE.Vector3().setFromMatrixPosition(cam.matrixWorld) : camera.position;
    let vH, vW, p11;
    if (xr) { const layer = renderer.xr.getBaseLayer && renderer.xr.getBaseLayer(); vH = (layer && (layer.framebufferHeight || layer.textureHeight)) || 1800; vW = (layer && (layer.framebufferWidth || layer.textureWidth)) || vH; const sub = cam.cameras && cam.cameras[0]; p11 = (sub ? sub.projectionMatrix : cam.projectionMatrix).elements[5] || 1; vW = vH; }
    else { vH = renderer.domElement.height; vW = renderer.domElement.width; p11 = camera.projectionMatrix.elements[5] || 1; }
    const session = (xrFrame && xrFrame.session) || xrSession, blend = (session && session.environmentBlendMode) || "opaque", passthrough = xr && isPassthroughBlend(blend);
    updateHands();
    world.update(head, { passthrough, viewportH: vH, viewportW: vW, flat: !xr, p11 });
    if (xr && xrFrame && hitTest.source) {
      const res = xrFrame.getHitTestResults(hitTest.source), ref = renderer.xr.getReferenceSpace();
      if (res.length && ref) { const pose = res[0].getPose(ref); hitTest.pose = pose; if (pose && reticle) { reticle.matrix.fromArray(pose.transform.matrix); reticle.visible = arActive; } } else { hitTest.pose = null; if (reticle) reticle.visible = false; }
    }
    viz.updateLabels((p) => hiddenByEarth(far, p));
    { const mk = world.marker.position, hid = state.view !== "model" || hiddenByEarth(far, [mk.x, mk.y, mk.z]); world.marker.visible = !hid; world.markerGlow.visible = !hid; }
    for (const sp of world.ringLabels) sp.visible = state.view === "model" && !hiddenByEarth(far, [sp.position.x, sp.position.y, sp.position.z]);
    updateArrows(head);
    if (xr && panel.mesh.visible && (panelDirty || now - lastPanelDraw > 500)) { panel.draw(model()); panelDirty = false; lastPanelDraw = now; }
    renderer.render(scene, camera); frames++;
    if (now - statT > 500) {
      stats = { fps: Math.round(frames * 1000 / (now - statT)), worstMs: Math.round(worst), calls: renderer.info.render.calls, tris: renderer.info.render.triangles };
      stats.text = `${stats.fps} fps, worst ${stats.worstMs} ms, ${stats.calls} draw calls, ${stats.tris} triangles`; onFrameStats(stats); frames = 0; statT = now; worst = 0;
    }
  });
  function updateArrows(head) {
    const e = sims.get(state.selected) || [...sims.values()].pop();
    if (!e || e.ended || !(state.velvec || state.gravec)) { velArrow.hide(); gravArrow.hide(); return; }
    const fr = world.cur.frame, { u, f } = planeAxes(fr), s = e.sim, pos = viz.worldOf(s.x, s.y), eye = [head.x, head.y, head.z];
    if (hiddenByEarth(far, pos)) { velArrow.hide(); gravArrow.hide(); return; }
    const w = (dx, dy) => [0, 1, 2].map((i) => u[i] * dx + f[i] * dy);
    if (state.velvec) velArrow.set(pos, w(s.vx, s.vy), eye, 4, `${(s.speedNow / 1000).toFixed(2)} km/s`); else velArrow.hide();
    if (state.gravec) { const r = Math.hypot(s.x, s.y); gravArrow.set(pos, w(-s.x, -s.y), eye, 4, state.help >= 1 ? `${(gAt(s.GM * s.gdial / 100, r)).toFixed(2)} m/s\u00b2` : ""); } else gravArrow.hide();
  }

  // ---- startup: preloads, first frame ----
  applyFrame();
  const preload = state.shots.slice();
  for (const v of preload) { const e = fire(v); let guard = 0; while (e.sim.status === "flying" && !e.sim.lapped && guard++ < 2e6) { stepShot(e.sim); viz.record(e.it, e.sim.x, e.sim.y); } if (e.sim.status === "flying") { viz.setBall(e.it, e.sim.x, e.sim.y); viz.retire(e.it); } finish(e); }
  if (preload.length) { accum = 0; }
  world.assetsReady.then(() => onState(state));
  onStatus(""); emitXr(false); onState(state);

  return {
    THREE, renderer, scene, camera, catalog, world, viz, panel, model,
    get state() { return state; }, dispatch, advance, stepSeconds(sec, wallDt = 1 / 60) { for (let t = 0; t < sec; t += wallDt) advance(Math.min(wallDt, sec - t)); },
    sims, panelImage(tab, page = 0) { const old = [panel.tab, panel.page[panel.tab]]; panel.tab = tab; panel.page[tab] = page; panel.draw(model()); const url = panel.canvas.toDataURL("image/png"); panel.tab = old[0]; panel.page[old[0]] = old[1]; panelDirty = true; return url; },
    get xrSupported() { return xrSupported; }, get arSupported() { return arSupported; }, get seeRoom() { return seeRoom; }, get arActive() { return arActive; }, get hitTestOk() { return hitTest.ok; },
    startXR: () => startSession(preferredXrMode(seeRoom, xrSupported, arSupported)), enterVR: () => startSession("immersive-vr"), enterAR: () => startSession("immersive-ar"), setSeeRoom,
    getLookAround: () => ({ ...look }), setLookAround, ingestOrientation,
    view, orbit, getView: () => (state.view === "mountain" ? (look.active ? { yaw: look.offsetYaw, pitch: look.offsetPitch, fovDeg: DESKTOP_FOV } : { ...view }) : { yaw: orbit.yaw, pitch: orbit.pitch, fovDeg: DESKTOP_FOV }),
    setView(v) {
      if (state.view === "model") { if (v.yaw !== undefined) orbit.yaw = v.yaw; if (v.pitch !== undefined) orbit.pitch = Math.max(-1.4, Math.min(1.4, v.pitch)); return; }
      if (look.active) { if (v.yaw !== undefined) look.offsetYaw = v.yaw; if (v.pitch !== undefined) look.offsetPitch = Math.max(-1.55, Math.min(1.55, v.pitch)); } else { if (v.yaw !== undefined) view.yaw = v.yaw; if (v.pitch !== undefined) view.pitch = Math.max(-1.55, Math.min(1.55, v.pitch)); }
    },
    dolly(k) { orbit.dist = Math.max(1.6, Math.min(6, orbit.dist * k)); },
    /** Select the shot nearest a screen point (flags, balls and trail points). */
    pickAt(clientX, clientY) {
      const r = canvas.getBoundingClientRect(), ndc = new THREE.Vector2(((clientX - r.left) / r.width) * 2 - 1, -((clientY - r.top) / r.height) * 2 + 1);
      camera.updateMatrixWorld(true); const d = new THREE.Vector3(ndc.x, ndc.y, 0.5).unproject(camera).sub(camera.position).normalize();
      return pickShotRay([camera.position.x, camera.position.y, camera.position.z], [d.x, d.y, d.z]);
    },
    project(world3) { const v = new THREE.Vector3(...world3).project(camera), r = canvas.getBoundingClientRect(); return { x: (v.x + 1) / 2 * r.width, y: (1 - v.y) / 2 * r.height, visible: v.z < 1 && Math.abs(v.x) <= 1.05 && Math.abs(v.y) <= 1.05 }; },
    selectedWorld() { const e = sims.get(state.selected); if (!e) return null; return e.it.landed ? e.it.flagWorld || viz.worldOf(e.sim.x, e.sim.y) : viz.worldOf(e.sim.x, e.sim.y); },
    serialize: () => serialize(state), applyFrame, placeModel, stats: () => stats, derivedNow: () => derived(c(), hM()),
    debug: () => ({ ...world.cur, sims: sims.size, assets: world.assets, far: { oc: far.uOC.value.toArray(), c: far.uOC2mR2.value } }),
  };
}
