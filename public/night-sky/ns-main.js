// Night Sky: boot, renderer, XR session, frame loop, picking. The page glue (HTML panel, card, buttons) is ns-page-ui.js.
import * as THREE from "../vendor/three/three.module.min.js";
import { parseQuery, serialize, reduce, simTimeMs, LOOKS } from "./ns-state.js";
import { skyMatrix, dateMatrix, worldToAltAz, colorClass, LY_PER_PC, centuriesSinceJ2000, lstDeg, refractDir, unrefractDir } from "./ns-astro.js";
import { sunPosition } from "./ns-ephem.js";
import { loadCatalog } from "./ns-catalog.js";
import { registerLayer, initLayers, updateLayers, getLayer } from "./ns-layers.js";
import { SKIN } from "./ns-skin.js";
import { SKY_R, setMatrix3, apply, applyT, raDecVec } from "./ns-util.js";
import { pickSky, samePick, buildConstellationIndex } from "./ns-pick.js";
import { createOrientationFilter, compassAlpha, screenAngleDeg, lookDir } from "./ns-orient.js";
import { starsLayer } from "./layers/stars.js";
import { constellationsLayer } from "./layers/constellations.js";
import { groundLayer } from "./layers/ground.js";
import { gridLayer } from "./layers/grid.js";
import { trailsLayer } from "./layers/trails.js";
import { solarLayer, PLANET_SIZE_NOTE } from "./layers/solar.js";
import { starNamesLayer } from "./layers/starnames.js";
import { LabelCard, TextBillboards } from "./ns-labels.js";
import { VRPanel, loadPanelAssets, UNITS } from "./ns-vrpanel.js";
import { XRInput } from "./ns-input.js";

const D2R = Math.PI / 180;
const DESKTOP_FOV = 70;           // vertical field of view on the page; never changes (no zoom)
const COMPASS = ["N", "NNE", "NE", "ENE", "E", "ESE", "SE", "SSE", "S", "SSW", "SW", "WSW", "W", "WNW", "NW", "NNW"];

export async function boot({ canvas, onState = () => {}, onStatus = () => {}, onXr = () => {}, onFrameStats = () => {}, query = location.search, wallNow = () => Date.now() }) {
  let state = parseQuery(query, wallNow());
  const baseUrl = new URL("./", import.meta.url);
  onStatus("Loading stars...");
  const catalog = await loadCatalog(new URL("data/", baseUrl).href);
  const conName = new Map(catalog.constellations.constellations.map((c) => [c.id, c]));
  const conIndex = buildConstellationIndex(catalog.constellations.constellations, (i) => catalog.stars.starVec(i));

  const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, powerPreference: "high-performance" });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
  renderer.xr.enabled = true; renderer.xr.setReferenceSpaceType("local-floor"); renderer.xr.setFramebufferScaleFactor(1.0);
  const scene = new THREE.Scene(); scene.background = new THREE.Color(0x000000); // the sky colour is the dome in layers/ground.js
  const camera = new THREE.PerspectiveCamera(DESKTOP_FOV, 1, 0.05, 2000); camera.position.set(0, 1.6, 0); camera.rotation.order = "YXZ"; scene.add(camera);
  const skyRoot = new THREE.Group(), skyGroup = new THREE.Group(), dateGroup = new THREE.Group(), groundGroup = new THREE.Group();
  skyGroup.matrixAutoUpdate = false; dateGroup.matrixAutoUpdate = false;
  skyRoot.add(skyGroup, dateGroup); scene.add(skyRoot, groundGroup);

  const frame = { simMs: 0, M: null, Md: null, viewportH: 800, daylight: 0, fallbackUp: [0, 0, -1], solar: [], sunDir: [0, -1, 0], sunLocal: [0, -1, 0], uRefract: { value: 0 }, refract: false, flat: true, starScale: 1 };
  const ctx = { THREE, scene, skyRoot, skyGroup, dateGroup, groundGroup, catalog, renderer, camera, skin: SKIN, frame, baseUrl,
    get state() { return state; }, observer: () => ({ type: "surface", latDeg: state.lat, lonDeg: state.lon, tz: state.tz }),
    clock: { get simTimeMs() { return simTimeMs(state, wallNow()); } }, highlightDir: () => highlight(), onLayerStatus: () => refresh() };
  const panelAssets = await loadPanelAssets(baseUrl); // Inter must be loaded before any label atlas is drawn
  for (const L of [starsLayer(), constellationsLayer(), starNamesLayer(), gridLayer(), trailsLayer(), solarLayer(), groundLayer()]) registerLayer(L);
  computeFrame();
  await initLayers(ctx);

  // ---- view direction ----
  const view = { yaw: 0, pitch: 0, fovDeg: DESKTOP_FOV };
  function lookAzAlt() {
    if (state.look === "polaris") { const i = catalog.stars.indexOfHip.get(11767); const d = apply(frame.M, catalog.stars.starVec(i)); const a = worldToAltAz(d); return [a.az, Math.min(a.alt, 60)]; }
    if (LOOKS[state.look]) return LOOKS[state.look];
    const [az, alt] = state.look.split(",").map(Number); return [az, alt];
  }
  function applyLook() {
    const [az, alt] = lookAzAlt();
    view.yaw = -az * D2R;
    // Named looks (south, etc.) start 10 deg higher on narrow flat screens so less of the view is ground. Headset and
    // explicit look=az,alt or look=polaris keep the pitch they asked for.
    const narrow = !renderer.xr.isPresenting && (canvas.clientWidth || window.innerWidth || 1280) <= 820;
    view.pitch = (alt + (LOOKS[state.look] && narrow ? 10 : 0)) * D2R;
  }
  applyLook();

  // ---- picking ----
  function pick(local) {
    const hit = pickSky(local, {
      solar: frame.solar, planetsOn: state.planets, groundOn: state.ground, stars: catalog.stars, magLimit: state.mag,
      conIndex, applyT, M: frame.M, unrefract: (v) => unrefractDir(v, frame.refract),
      worldStar: (i) => refractDir(apply(frame.M, catalog.stars.starVec(i)), frame.refract),
    });
    return infoFromPick(hit);
  }
  function infoFromPick(hit) {
    if (!hit) return null;
    if (hit.kind === "body") return bodyInfo(hit.body);
    if (hit.kind === "star") return starInfo(hit.index);
    if (hit.kind === "constellation") return conInfo(hit.rec);
    return null;
  }
  const azWord = (az) => COMPASS[Math.round(az / 22.5) % 16];
  const altAzLine = (d) => { const a = worldToAltAz(d); return `Altitude ${a.alt.toFixed(1)}°, azimuth ${a.az.toFixed(1)}° (${azWord(a.az)})`; };
  function starInfo(i) {
    const st = catalog.stars, con = conName.get(st.con(i)), bv = st.bv[i], dist = st.dist[i];
    const dir = refractDir(apply(frame.M, st.starVec(i)), frame.refract);
    const proper = st.proper(i), catName = st.catalogName(i);
    return { kind: "star", index: i, dir, title: proper || catName || st.label(i), common: proper && catName && catName !== proper ? catName : "", lines: [
      con ? `${con.latin} (${con.english})` : st.con(i) || "No constellation listed",
      `Magnitude ${st.mag[i].toFixed(2)}`,
      st.spect(i) ? `Spectral type ${st.spect(i)}` : "Spectral type not listed",
      `Color: ${colorClass(bv)}${Number.isFinite(bv) ? ` (B-V ${bv.toFixed(2)})` : ""}`,
      Number.isFinite(dist) ? `Distance about ${fmtLy(dist * LY_PER_PC)} light years` : "Distance unknown",
      altAzLine(dir)] };
  }
  function conInfo(rec) {
    const dir = refractDir(apply(frame.M, rec.center), frame.refract);
    return { kind: "constellation", id: rec.id, dir, title: rec.latin, common: rec.english, lines: [altAzLine(dir)] };
  }
  function bodyInfo(b) {
    const lines = [];
    if (b.id === "moon") { const p = frame.moonPhase; lines.push(`${Math.round(p.fraction * 100)}% lit, ${p.waxing ? "waxing" : "waning"}`, `Distance about ${Math.round(b.body.distKm / 100) * 100} km`); }
    else if (b.id === "sun") lines.push("Our star. Never look at the real Sun.", `Distance ${b.body.distAu.toFixed(3)} AU`);
    else lines.push("Planet", `Distance ${b.body.distAu.toFixed(2)} AU`, PLANET_SIZE_NOTE);
    lines.push(altAzLine(b.dir));
    return { kind: "body", id: b.id, dir: b.dir, title: b.name, lines };
  }
  const fmtLy = (ly) => (ly < 100 ? ly.toFixed(1) : Math.round(ly).toLocaleString("en-US"));

  function highlight() {
    const hl = state.hl; if (!hl) return null; const st = catalog.stars;
    let i = -1;
    if (hl === "polaris") i = st.indexOfHip.get(11767); else if (hl.startsWith("hip:")) i = st.indexOfHip.get(+hl.slice(4)) ?? -1;
    if (i >= 0) return { dir: refractDir(apply(frame.M, st.starVec(i)), frame.refract), radiusDeg: 2.2 };
    const c = catalog.constellations.constellations.find((x) => x.id.toLowerCase() === hl);
    if (!c) return null;
    const center = raDecVec(c.labelRa * 15, c.labelDec); let r = 3;
    for (const l of c.lines) for (const k of l) { const v = st.starVec(k); r = Math.max(r, Math.acos(Math.min(1, v[0] * center[0] + v[1] * center[1] + v[2] * center[2])) / D2R); }
    return { dir: refractDir(apply(frame.M, center), frame.refract), radiusDeg: Math.min(r + 2, 25) };
  }

  // ---- XR ----
  const card = new LabelCard(THREE, SKIN); skyRoot.add(card.mesh);
  const panel = new VRPanel(THREE, panelAssets); scene.add(panel.mesh);
  let selection = null, hover = null;
  const hoverRing = makeHoverRing(); skyRoot.add(hoverRing);
  const look = { active: false, mode: "relative", note: "", hasSample: false, offsetYaw: 0, offsetPitch: 0 };
  const oriFilter = createOrientationFilter(0.32);
  let lastCompassAt = 0;
  function conLayer() { return getLayer("constellations"); }
  function setSelection(info) {
    selection = info || null;
    if (!selection) { card.hide(); const L = conLayer(); if (L && L.setFocus) L.setFocus(null); return; }
    if (renderer.xr.isPresenting) card.show(selection, selection.dir);
    const L = conLayer();
    if (L && L.setFocus) L.setFocus(selection.kind === "constellation" ? selection.id : null);
  }
  function selectPick(info) {
    if (!info || samePick(info, selection)) { setSelection(null); return null; }
    setSelection(info); return info;
  }
  function setHover(info) { hover = info || null; }
  function placeHoverRing() {
    const src = hover;
    hoverRing.visible = !!src;
    if (!src) return;
    const rad = src.kind === "constellation" ? 6 : 2.2;
    const s = 700 * Math.tan(rad * Math.PI / 180);
    hoverRing.position.set(src.dir[0] * 700, src.dir[1] * 700, src.dir[2] * 700);
    hoverRing.lookAt(skyRoot.localToWorld(new THREE.Vector3(0, 0, 0)));
    hoverRing.scale.set(s, s, s);
  }
  function setLookAround(on) {
    if (on) {
      look.active = true; look.hasSample = false; look.mode = "relative"; look.note = ""; look.offsetYaw = 0; look.offsetPitch = 0;
      oriFilter.reset(); lastCompassAt = 0;
    } else {
      if (look.active && look.hasSample) {
        const d = lookDir({ x: camera.quaternion.x, y: camera.quaternion.y, z: camera.quaternion.z, w: camera.quaternion.w });
        const a = worldToAltAz(d);
        view.yaw = -a.az * D2R; view.pitch = a.alt * D2R;
      }
      look.active = false; look.hasSample = false; look.note = ""; oriFilter.reset(); setHover(null);
    }
    return look;
  }
  function ingestOrientation(ev, screenDeg) {
    const c = compassAlpha(ev);
    if (c.alpha == null || ev.beta == null || ev.gamma == null || !Number.isFinite(ev.beta) || !Number.isFinite(ev.gamma)) return look;
    const now = (typeof performance !== "undefined" && performance.now) ? performance.now() : Date.now();
    if (c.mode === "compass") { look.mode = "compass"; look.note = ""; lastCompassAt = now; }
    else if (look.mode === "compass" && now - lastCompassAt < 1500) return look;
    else if (look.mode !== "compass") { look.mode = "relative"; look.note = "Sky is not aligned to north. Drag to adjust."; }
    const scr = screenDeg != null ? screenDeg : screenAngleDeg();
    oriFilter.push(c.alpha, ev.beta, ev.gamma, scr);
    look.hasSample = true;
    return look;
  }
  const hud = makeHud(); camera.add(hud.mesh);
  const vignette = makeVignette(); camera.add(vignette);
  let xrSupported = false, panelDirty = true, lastPanelDraw = 0, scrubTotal = 0, scrubFade = 0;
  const STEP_ACTION = (dir) => (panel.unit === 2 ? { type: "jump", months: dir } : { type: "jump", deltaMs: dir * UNITS[panel.unit][1] });
  function press(i, h) {
    panel.pressed = h.id; panelDirty = true; setTimeout(() => { if (panel.pressed === h.id) { panel.pressed = null; panelDirty = true; } }, 150);
    const gp = xrInput.ctrl[i].source && xrInput.ctrl[i].source.gamepad; const ha = gp && gp.hapticActuators && gp.hapticActuators[0];
    if (ha && ha.pulse) ha.pulse(0.4, 15).catch(() => {}); // 15 ms haptic pulse (ui-spec section 3)
    const a = h.action;
    if (a.step) dispatch(STEP_ACTION(a.step));
    else if (a.reverse) { const sp = state.clock.speed; if (sp) dispatch({ type: "setSpeed", speed: -sp }); else panel.reverse = !panel.reverse; panelDirty = true; }
    else if (a.speedAbs) { const neg = state.clock.speed < 0 || (state.clock.speed === 0 && panel.reverse); dispatch({ type: "setSpeed", speed: neg ? -a.speedAbs : a.speedAbs }); }
    else if (a.cycleUnit) { panel.unit = (panel.unit + 1) % 3; panelDirty = true; }
    else dispatch(a);
  }
  const xrInput = new XRInput(THREE, renderer, scene, {
    onHover(i, ray) {
      if (panel.drag && panel.drag.ctrl === i) {
        if (panel.drag.kind === "panel") { panel.updateDrag(ray, camera); return; }
        const ph = panel.intersect(ray); if (!ph) return;
        if (panel.drag.kind === "slider") dispatch({ type: "set", key: "artalpha", value: Math.round(Math.min(1, Math.max(0, (ph.px - 290) / 510)) * 100) / 100 }, { quiet: true });
        if (panel.drag.kind === "scrub") {
          const k = Math.min(1, Math.max(0, (ph.px - 330) / 626)); panel.scrub = k;
          const units = Math.round((k - 0.5) * 8 * 4) / 4; // 9 ticks = -4..+4 units, quarter-unit steps
          dispatch({ type: "setTime", utcMs: panel.drag.t0 + units * UNITS[panel.unit][1] }, { quiet: true });
          panel.scrubLabel = `Scrubbing  ${units >= 0 ? "+" : ""}${units} ${["h", "d", "mo"][panel.unit]}`; panelDirty = true;
        }
        return;
      }
      const ph = panel.intersect(ray);
      const id = ph && ph.hit ? ph.hit.id : null;
      if (id !== panel.hover && i === activeHand) { panel.hover = id; panelDirty = true; }
      if (ph) activeHand = i;
      // The controller ray is the main pointer (hands can still pinch, but have no ray). Hover the sky when the ray misses the panel.
      const hand = xrInput.ctrl[i].handInput;
      if (!ph && !hand) setHover(pick(toLocal(ray.dir)));
      else if (!ph && hand && !xrInput.ctrl.some((c, j) => j !== i && c.source && !c.handInput)) setHover(pick(toLocal(ray.dir)));
      xrInput.setRayLength(i, ph ? ph.dist : 5);
    },
    onSelectStart(i, ray) {
      const ch = card.hit(ray);
      if (ch === "close") { setSelection(null); return; }
      const ph = panel.intersect(ray);
      if (ph) {
        const h = ph.hit; if (!h) return;
        if (h.drag) panel.drag = { kind: "panel", ctrl: i, dist: ph.dist };
        else if (h.tab) { if (panel.tab === h.tab && panel.page[h.tab] !== undefined) panel.page[h.tab] = 1 - panel.page[h.tab]; else panel.tab = h.tab; panelDirty = true; }
        else if (h.page !== undefined) { panel.page[panel.tab] = h.page; panelDirty = true; }
        else if (h.slider) panel.drag = { kind: "slider", ctrl: i };
        else if (h.scrub) panel.drag = { kind: "scrub", ctrl: i, t0: simTimeMs(state, wallNow()) };
        else if (h.action) press(i, h);
        return;
      }
      selectPick(pick(toLocal(ray.dir)));
    },
    onSelectEnd(i) { if (panel.drag && panel.drag.ctrl === i) { if (panel.drag.kind === "scrub") { panel.scrub = 0.5; panel.scrubLabel = ""; } panel.drag = null; panelDirty = true; } },
    onScrubHours(dh) {
      dispatch({ type: "scrub", deltaMs: dh * 3600e3 }, { quiet: true });
      scrubTotal += dh; scrubFade = performance.now() + 1200;
      panel.scrubLabel = `Scrubbing  ${scrubTotal >= 0 ? "+" : ""}${scrubTotal.toFixed(1)} h`; panelDirty = true;
    },
    onTogglePanel() { panel.mesh.visible = !panel.mesh.visible; if (panel.mesh.visible) { panel.placeInFront(renderer.xr.getCamera()); panelDirty = true; } },
  });
  let activeHand = 0;
  function toLocal(dirWorld) { const v = new THREE.Vector3(dirWorld.x, dirWorld.y, dirWorld.z).applyAxisAngle(new THREE.Vector3(0, 1, 0), -skyRoot.rotation.y); return [v.x, v.y, v.z]; }

  if (navigator.xr && navigator.xr.isSessionSupported) {
    try { xrSupported = await navigator.xr.isSessionSupported("immersive-vr"); } catch { xrSupported = false; }
  }
  let arSupported = false;
  if (navigator.xr && navigator.xr.isSessionSupported) {
    try { arSupported = await navigator.xr.isSessionSupported("immersive-ar"); } catch { arSupported = false; }
  }
  const nightBackground = scene.background;
  function restoreSceneBackground() {
    scene.background = nightBackground;
    if (renderer.setClearAlpha) renderer.setClearAlpha(1);
  }
  function onSessionEnd() {
    xrSession = null; skyRoot.rotation.y = 0; panel.mesh.visible = false;
    setSelection(null); setHover(null); restoreSceneBackground();
    onXr({ supported: xrSupported, presenting: false, arSupported }); applyCamera();
  }
  onXr({ supported: xrSupported, presenting: false, arSupported });
  let xrSession = null;
  async function startSession(mode) {
    if (!navigator.xr || xrSession) return;
    const optional = mode === "immersive-ar"
      ? ["local-floor", "bounded-floor", "hit-test", "dom-overlay"]
      : ["local-floor", "bounded-floor", "hand-tracking"];
    const init = { optionalFeatures: optional };
    if (mode === "immersive-ar" && typeof document !== "undefined") init.optionalFeatures = optional; // keep init simple; overlay is optional
    const session = await navigator.xr.requestSession(mode, init);
    xrSession = session;
    session.addEventListener("end", onSessionEnd);
    if (mode === "immersive-ar") { scene.background = null; if (renderer.setClearAlpha) renderer.setClearAlpha(0); }
    await renderer.xr.setSession(session);
    // look= turns the sky (play-space yaw offset), never the user's head
    const [az] = lookAzAlt(); skyRoot.rotation.y = az * D2R;
    camera.rotation.set(0, 0, 0);
    panel.mesh.visible = state.ui; panelDirty = true; panelNeedsPlace = true;
    onXr({ supported: xrSupported, presenting: true, arSupported, mode });
  }
  async function enterVR() { return startSession("immersive-vr"); }
  async function enterAR() { return startSession("immersive-ar"); }
  let panelNeedsPlace = false;

  // ---- state ----
  let urlTimer = 0;
  function dispatch(action, opt = {}) {
    const before = state;
    state = reduce(state, { ...action, wallMs: wallNow() });
    if (state === before) return state;
    if (action.type === "setPlace" || action.type === "nudge") applyLookIfDesktop();
    panelDirty = true;
    clearTimeout(urlTimer); urlTimer = setTimeout(syncUrl, opt.quiet ? 400 : 60);
    onState(state);
    return state;
  }
  function applyLookIfDesktop() { /* keep the student's current view direction when the place changes */ }
  function syncUrl() { const q = serialize(state, wallNow()); try { history.replaceState(history.state, "", q ? "?" + q : location.pathname); } catch {} }
  function refresh() { panelDirty = true; onState(state); }

  // ---- frame ----
  function computeFrame() {
    frame.simMs = simTimeMs(state, wallNow());
    frame.M = skyMatrix(frame.simMs, state.lat, state.lon);
    frame.Md = dateMatrix(frame.simMs, state.lat, state.lon);
    setMatrix3(skyGroup.matrix, frame.M); skyGroup.matrixWorldNeedsUpdate = true;
    setMatrix3(dateGroup.matrix, frame.Md); dateGroup.matrixWorldNeedsUpdate = true;
    const s = sunPosition(frame.simMs); const sd = apply(frame.Md, raDecVec(s.raDeg, s.decDeg));
    frame.refract = state.sky === "real";
    frame.uRefract.value = frame.refract ? 1 : 0;
    frame.sunLocal = frame.refract ? refractDir(sd) : sd; // local frame (x E, y up, z S), read by the sky dome glow
    frame.sunAlt = Math.asin(frame.sunLocal[1]) / D2R; // apparent in Real Sky so sunrise matches the lifted Sun
    // real sky: daylight washes stars out (civil 6, nautical 12, astronomical 18 degrees of Sun depression)
    frame.daylight = state.sky === "real" ? Math.pow(Math.min(1, Math.max(0, (frame.sunAlt + 18) / 18)), 2) : 0;
  }
  function applyCamera() {
    if (renderer.xr.isPresenting) return;
    if (look.active && look.hasSample && oriFilter.quaternion) {
      const q = oriFilter.quaternion;
      camera.quaternion.set(q.x, q.y, q.z, q.w);
      camera.quaternion.multiply(new THREE.Quaternion().setFromEuler(new THREE.Euler(look.offsetPitch, look.offsetYaw, 0, "YXZ")));
    } else {
      camera.rotation.set(view.pitch, view.yaw, 0);
    }
  }
  function resize() {
    const w = canvas.clientWidth || 1, h = canvas.clientHeight || 1;
    renderer.setSize(w, h, false); camera.aspect = w / h; camera.updateProjectionMatrix();
  }
  new ResizeObserver(resize).observe(canvas); resize();

  let last = performance.now(), frames = 0, statT = last, worst = 0;
  renderer.setAnimationLoop((now, xrFrame) => {
    const dt = Math.min(0.1, (now - last) / 1000); worst = Math.max(worst, now - last); last = now;
    computeFrame();
    const xr = renderer.xr.isPresenting;
    applyCamera();
    camera.updateMatrixWorld(true);
    const cam = xr ? renderer.xr.getCamera() : camera;
    const cp = new THREE.Vector3().setFromMatrixPosition(cam.matrixWorld);
    skyRoot.position.copy(cp); // no parallax: the sky is centred on the eye
    const fwd = new THREE.Vector3(0, 0, -1).transformDirection(cam.matrixWorld).applyAxisAngle(new THREE.Vector3(0, 1, 0), -skyRoot.rotation.y);
    frame.fallbackUp = [fwd.x, 0, fwd.z];
    if (xr) {
      const layer = renderer.xr.getBaseLayer && renderer.xr.getBaseLayer();
      frame.viewportH = (layer && (layer.framebufferHeight || layer.textureHeight)) || 1800;
      if (panelNeedsPlace) { panel.placeInFront(cam); panelNeedsPlace = false; }
      xrInput.update(dt);
      if (scrubFade && now > scrubFade && !panel.drag) { scrubFade = 0; scrubTotal = 0; panel.scrubLabel = ""; panelDirty = true; }
      if (panel.mesh.visible && (panelDirty || now - lastPanelDraw > 1000)) { // redraw only on change, or once a second for the clock
        panel.draw(state, { simMs: frame.simMs, artStatus: getLayer("constellations").status.art });
        panelDirty = false; lastPanelDraw = now;
      }
      hud.mesh.visible = state.debug;
      placeHoverRing();
    } else {
      frame.viewportH = renderer.domElement.height;
      if (look.active) {
        const fwd = new THREE.Vector3(0, 0, -1).transformDirection(camera.matrixWorld);
        setHover(pick(toLocal(fwd)));
      }
      placeHoverRing();
    }
    frame.flat = !xr; // flat screens: stars (and planets) get a size boost; the headset keeps true angular size
    frame.starScale = frame.flat ? Math.min(2.2, Math.max(1, 22 / (0.5 * frame.viewportH * (camera.projectionMatrix.elements[5] || 1) * Math.PI / 180))) : 1;
    TextBillboards.scale = xr ? 1 : Math.min(1, Math.max(0.6, (canvas.clientHeight || 700) / 700)); // Leo's sizes are for the headset; smaller on phones
    vignette.visible = state.vignette && Math.abs(state.clock.speed) >= 600; // comfort vignette at 600x and above
    updateLayers(ctx, dt);
    renderer.render(scene, camera);
    frames++;
    if (now - statT > 500) {
      stats = { fps: Math.round(frames * 1000 / (now - statT)), worstMs: Math.round(worst), calls: renderer.info.render.calls, tris: renderer.info.render.triangles };
      stats.text = `${stats.fps} fps, worst ${stats.worstMs} ms, ${stats.calls} draw calls, ${stats.tris} triangles`;
      onFrameStats(stats); frames = 0; statT = now; worst = 0;
      if (state.debug && renderer.xr.isPresenting) hud.draw(stats.text);
    }
  });
  let stats = { text: "" };

  function makeHoverRing() {
    const rp = [];
    for (let i = 0; i < 64; i++) {
      const a = (i / 64) * Math.PI * 2, b = ((i + 1) / 64) * Math.PI * 2;
      rp.push(Math.cos(a), Math.sin(a), 0, Math.cos(b), Math.sin(b), 0);
    }
    const ring = new THREE.LineSegments(new THREE.BufferGeometry().setAttribute("position", new THREE.Float32BufferAttribute(rp, 3)), new THREE.LineBasicMaterial({ color: SKIN.highlight.color, transparent: true, opacity: 0.85, depthWrite: false }));
    ring.renderOrder = 16; ring.frustumCulled = false; ring.visible = false; return ring;
  }
  function makeHud() { // ?debug=1 in the headset: a small text strip low in the view
    const c = document.createElement("canvas"); c.width = 1024; c.height = 96; const tex = new THREE.CanvasTexture(c); tex.colorSpace = THREE.SRGBColorSpace;
    const mesh = new THREE.Mesh(new THREE.PlaneGeometry(0.4, 0.0375), new THREE.MeshBasicMaterial({ map: tex, transparent: true, depthTest: false, toneMapped: false }));
    mesh.position.set(0, -0.22, -0.8); mesh.renderOrder = 99; mesh.visible = false;
    return { mesh, draw(t) { const g = c.getContext("2d"); g.clearRect(0, 0, 1024, 96); g.fillStyle = "rgba(0,0,0,0.6)"; g.fillRect(0, 0, 1024, 96); g.fillStyle = "#fff"; g.font = "500 44px Inter, system-ui"; g.fillText(t, 20, 64); tex.needsUpdate = true; } };
  }
  function makeVignette() {
    const m = new THREE.Mesh(new THREE.PlaneGeometry(2, 2), new THREE.ShaderMaterial({
      vertexShader: "varying vec2 vUv; void main(){ vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position,1.0); }",
      fragmentShader: "varying vec2 vUv; void main(){ float r = length(vUv - 0.5) * 2.0; float a = smoothstep(0.45, 0.95, r) * 0.92; gl_FragColor = vec4(0.0, 0.0, 0.0, a); }",
      transparent: true, depthTest: false, depthWrite: false }));
    m.position.set(0, 0, -0.3); m.scale.set(0.45, 0.45, 1); m.renderOrder = 100; m.visible = false; m.frustumCulled = false;
    return m;
  }

  onStatus("");
  onState(state);
  return {
    THREE, renderer, scene, camera, catalog,
    get state() { return state; }, dispatch, enterVR, enterAR, get xrSupported() { return xrSupported; }, get arSupported() { return arSupported; },
    get frame() { return frame; }, view, artStatus: () => getLayer("constellations").status.art, applyLook: () => { applyLook(); },
    setView(v) {
      const tgt = look.active ? look : view;
      if (look.active) { if (v.yaw !== undefined) look.offsetYaw = v.yaw; if (v.pitch !== undefined) look.offsetPitch = Math.max(-1.55, Math.min(1.55, v.pitch)); }
      else { if (v.yaw !== undefined) view.yaw = v.yaw; if (v.pitch !== undefined) view.pitch = v.pitch; }
    },
    getView: () => (look.active ? { yaw: look.offsetYaw, pitch: look.offsetPitch, fovDeg: view.fovDeg } : { ...view }),
    getLookAround: () => ({ ...look }),
    setLookAround, ingestOrientation,
    select: (info) => (info === undefined ? selection : selectPick(info)),
    getSelection: () => selection, getHover: () => hover, setHover,
    focusId: () => (conLayer() && conLayer().getFocus && conLayer().getFocus()) || null,
    focusArtAlpha: () => (conLayer() && conLayer().focusArtAlpha && conLayer().focusArtAlpha()) || 0,
    pickLocal: (dir) => pick(dir),
    /** Pick at page coordinates (desktop). Returns info or null. */
    pickAt(clientX, clientY) {
      const r = canvas.getBoundingClientRect();
      const ndc = new THREE.Vector2(((clientX - r.left) / r.width) * 2 - 1, -((clientY - r.top) / r.height) * 2 + 1);
      camera.updateMatrixWorld(true);
      const dir = new THREE.Vector3(ndc.x, ndc.y, 0.5).unproject(camera).sub(camera.position).normalize();
      return pick(toLocal(dir));
    },
    /** Screen position of a local-frame direction (for the HTML card). */
    project(dirLocal) {
      const v = new THREE.Vector3(...dirLocal).multiplyScalar(SKY_R).add(camera.position).project(camera);
      const r = canvas.getBoundingClientRect();
      return { x: (v.x + 1) / 2 * r.width, y: (1 - v.y) / 2 * r.height, visible: v.z < 1 && Math.abs(v.x) <= 1.05 && Math.abs(v.y) <= 1.05 };
    },
    serialize: () => serialize(state, wallNow()),
    altAzOf(raHours, decDeg) { return worldToAltAz(apply(frame.M, raDecVec(raHours * 15, decDeg))); },
    debugInfo: () => ({ lstDeg: lstDeg(frame.simMs, state.lat === undefined ? 0 : state.lon), T: centuriesSinceJ2000(frame.simMs), calls: stats.calls, tris: stats.tris }),
  };
}
