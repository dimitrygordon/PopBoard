// Gravity Force Lab VR: entry point. Renderer, the five scenes, the page panel and WebXR (Quest 3 controllers and hands).
// Flat screens (phone, tablet, Chromebook, laptop) get the same scenes with an HTML panel; every scene is completable
// without a headset (spec T17). Headset: Enter VR shows only when immersive-vr is supported, like Night Sky.
import * as THREE from "../vendor/three/three.module.min.js";
import { XRInput } from "../night-sky/ns-input.js";
import { parseState, serializeState, canSetHelp } from "./gf-state.js";
import { renderPanel, helpButtons } from "./gf-panel.js";
import { createLab, sceneModel, controlsFor, act, SCENE_ORDER, SCENE_SHORT, S1, clampDist, SORT_CARDS } from "./gf-scenes.js";
import { LabView, VIEWS, S3_X } from "./gf-view.js";
import { XRPanel, readPads } from "./gf-xr.js";

const $ = (id) => document.getElementById(id);
const q = new URLSearchParams(location.search);
const statusEl = $("gfStatus");
const fail = (msg) => { if (statusEl) { statusEl.hidden = false; statusEl.textContent = msg; } };
const esc = (s) => String(s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");

const lab = createLab(parseState(location.search));
const canvas = $("gfCanvas");
let renderer;
try { renderer = new THREE.WebGLRenderer({ canvas, antialias: true, powerPreference: "high-performance", preserveDrawingBuffer: q.has("shot") }); }
catch (e) { fail("This device could not start 3D graphics (WebGL). The panel still works."); }
const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(46, 1, 0.02, 200);
const view = new LabView(THREE); scene.add(view.root);
view.calm = typeof matchMedia === "function" && matchMedia("(prefers-reduced-motion: reduce)").matches;
if (renderer) { renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2)); renderer.xr.enabled = true; renderer.xr.setReferenceSpaceType("local-floor"); renderer.setClearColor(0x050a1e, 1); }

// ---------------- state, URL and actions ----------------
function syncUrl() { const s = serializeState(lab.url); history.replaceState(null, "", location.pathname + (s ? "?" + s : "")); }
function doAct(id) {
  if (!id) return; const before = lab.url.scene;
  if (act(lab, id, canSetHelp)) { if (lab.url.scene !== before) { viewOff.yaw = 0; viewOff.pitch = 0; } syncUrl(); renderPanelDom(); }
}
window.__gf = { lab, act: doAct, model: () => sceneModel(lab), frames: 0 };

// ---------------- page panel ----------------
const panelEl = $("gfPanel"); let domKey = "";
function tabsOf() { return SCENE_ORDER.map((s) => ({ id: "scene:" + s, label: SCENE_SHORT[s], on: lab.url.scene === s, disabled: lab.url.lock.includes("scene") && lab.url.scene !== s })); }
function helpsOf() { return helpButtons(lab.url).map((h) => ({ id: "help:" + h.level, label: h.label, on: h.selected, disabled: !h.enabled })); }
function dialHtml(r) {
  if (!r) return "";
  const one = (label, main, sub, unit) => `<div class="gf-dial"><p class="gf-dial-label">${esc(label)}</p><p class="gf-dial-main${String(main).length > 9 ? " long" : ""}">${esc(main)}</p>${sub ? `<p class="gf-dial-sub">${esc(sub)}</p>` : unit ? `<p class="gf-dial-unit">${esc(unit)}</p>` : ""}</div>`;
  return `<div class="gf-dials">${one(r.label, r.main, r.sub, r.unit)}${r.second ? one(r.second.label, r.second.main) : ""}</div>`;
}
function renderPanelDom(force = false) {
  const M = sceneModel(lab); const ctr = controlsFor(lab);
  const key = JSON.stringify([M.title, M.lines, M.cards, M.predict, M.reveal, M.result, M.readout, ctr, lab.url.help, lab.url.lock, M.sort, M.sortReveal, lab.whyCard, lab.wrongCard, M.link, M.tryLink, lab.massMode]);
  if (!force && key === domKey) return; domKey = key;
  const P = M.predict;
  const chips = P.ids.map((id, i) => { const lab_ = P.chips[i]; const on = P.order ? (P.progress || []).includes(lab_) : P.picked === lab_; const n = P.order && on ? `${P.progress.indexOf(lab_) + 1}. ` : "";
    return `<button type="button" class="gf-chip${on ? " on" : ""}" data-act="predict:${esc(id)}" aria-pressed="${on}"${P.order && P.picked != null ? " disabled" : ""}>${esc(n + lab_)}</button>`; }).join("");
  const reveal = M.reveal ? `<div class="gf-reveal"><p><span>You picked</span>${esc(M.reveal.picked)}</p><p><span>The model</span>${esc(M.reveal.model)}</p>${M.result ? `<p class="gf-result">${esc(M.result)}</p>` : ""}${M.followUp ? `<p class="gf-follow">${esc(M.followUp)}</p>` : ""}</div>` : "";
  const groups = {}; for (const c of ctr) { const g = c.group || (c.id === "reset" || c.id === "next" ? "nav" : "main"); (groups[g] = groups[g] || []).push(c); }
  const btns = (list) => list.map((c) => `<button type="button" class="gf-btn${c.on ? " on" : ""}${c.primary ? " primary" : ""}" data-act="${esc(c.id)}"${c.disabled ? " disabled" : ""} aria-pressed="${!!c.on}">${esc(c.label)}</button>`).join("");
  const ctrHtml = ["a", "b", "main", "nav"].filter((g) => groups[g]).map((g) => `<div class="gf-controls" data-group="${g}">${g === "a" || g === "b" ? `<span class="gf-glabel">${g.toUpperCase()}</span>` : ""}${btns(groups[g])}</div>`).join("");
  const why = lab.whyCard && M.why ? `<div class="gf-card"><p>${esc(M.why.text)}</p><p class="gf-foot">${esc(M.why.foot)}</p></div>` : "";
  const wrong = lab.wrongCard && M.wrong ? `<div class="gf-card"><p class="gf-cardtitle">What the picture gets wrong</p><ol>${M.wrong.map((w) => `<li>${esc(w)}</li>`).join("")}</ol></div>` : "";
  const sort = M.scene === "well" ? `<div class="gf-sort"><p class="gf-cardtitle">Real or model? Six cards, two bins</p>${M.sort.map((c) => { const r = M.sortReveal.find((x) => x.id === c.id);
    return `<div class="gf-sortrow"><p>${esc(c.text)}</p><div class="gf-bins"><button type="button" class="gf-chip${c.picked === "real" ? " on" : ""}" data-act="sort:${c.id}:real">Real</button><button type="button" class="gf-chip${c.picked === "model" ? " on" : ""}" data-act="sort:${c.id}:model">Model</button></div>${r ? `<p class="gf-why">You picked ${esc(r.picked)}. ${esc(r.why)}</p>` : ""}</div>`; }).join("")}</div>` : "";
  const notes = (M.notes || []).length ? `<details class="gf-notes"><summary>Honest notes</summary>${M.notes.map((n) => `<p>${esc(n)}</p>`).join("")}</details>` : "";
  const link = M.link ? `<p><a class="gf-link" href="${esc(M.link.href)}">${esc(M.link.label)}</a></p>` : "";
  const tryL = M.tryLink && lab.issStep !== "ride" ? `<p><a class="gf-link" href="${esc(M.tryLink.href)}">${esc(M.tryLink.label)}: Newton's Cannonball Fire</a></p>` : "";
  const tabs = tabsOf().map((t) => `<button type="button" class="gf-tab${t.on ? " on" : ""}" data-act="${t.id}"${t.disabled ? " disabled" : ""} aria-pressed="${t.on}">${esc(t.label)}</button>`).join("");
  panelEl.innerHTML = `<nav class="gf-tabs" aria-label="Scenes">${tabs}</nav>
    <p class="gf-kicker">${esc(M.kicker)}</p><h2 class="gf-title">${esc(M.title)}</h2>
    ${(M.cards || []).map((c) => `<p class="gf-cardline">${esc(c)}</p>`).join("")}
    <div class="gf-q"><p class="gf-qtext">Predict: ${esc(P.text)}</p><div class="gf-chips">${chips}</div></div>${reveal}
    ${dialHtml(M.readout)}
    <div class="gf-lines">${(M.lines || []).map((l) => `<p>${esc(l)}</p>`).join("")}</div>${why}${wrong}${link}${tryL}
    ${ctrHtml}${sort}
    <div class="gf-eqwrap${lab.eqHidden ? " hidden" : ""}"><p class="gf-cardtitle">${lab.url.help >= 1 ? "Equation" : "Help level"}</p>${M.eqNote && lab.url.help >= 2 ? `<p class="gf-foot">${esc(M.eqNote)}</p>` : ""}<div id="gfEq"></div></div>${notes}`;
  renderPanel($("gfEq"), { ...M.eq, help: lab.url.help, lock: lab.url.lock, previous: lab.prevEq && lab.prevEq.scene === M.scene ? lab.prevEq : undefined });
  lab.prevEq = { ...M.eq, scene: M.scene };
}
panelEl.addEventListener("click", (e) => {
  const b = e.target.closest("button"); if (!b || b.disabled) return;
  if (b.dataset.act) doAct(b.dataset.act); else if (b.dataset.helpLevel != null) doAct("help:" + b.dataset.helpLevel);
});

// ---------------- flat camera, drag and keys ----------------
const viewOff = { yaw: 0, pitch: 0 }; const layout = { w: 1, h: 1, phone: false };
function resize() {
  layout.phone = innerWidth < 760 && innerHeight > innerWidth * 0.9;
  document.body.classList.toggle("gf-phone", layout.phone);
  const r = canvas.getBoundingClientRect(); layout.w = Math.max(1, r.width); layout.h = Math.max(1, r.height);
  if (!renderer || renderer.xr.isPresenting) return;
  renderer.setSize(layout.w, layout.h, false); camera.aspect = layout.w / layout.h;
  const pr = !layout.phone ? panelEl.getBoundingClientRect() : null;
  if (pr && pr.width) { const free = pr.left; camera.setViewOffset(layout.w, layout.h, (layout.w - free) / 2, 0, layout.w, layout.h); } else camera.clearViewOffset();
  camera.updateProjectionMatrix();
}
addEventListener("resize", resize);
function flatCamera() {
  const sc = lab.url.scene; let V = VIEWS[sc]; if (sc === "iss" && lab.issStep === "station") V = VIEWS.issStation;
  const tgt = new THREE.Vector3(...V.target), pos = new THREE.Vector3(...V.pos);
  if (sc === "weigh") { const x = S3_X(["earth", "moon", "mars", "jupiter", "ns"].indexOf(lab.url.world)); tgt.x += x; pos.x += x * 0.85; }
  const fov = V.fov; const pr = !layout.phone ? panelEl.getBoundingClientRect() : null;
  const effAspect = (pr && pr.width ? pr.left : layout.w) / layout.h; const pull = Math.min(2.1, Math.max(1, 1.6 / Math.max(0.3, effAspect)));
  const off = pos.clone().sub(tgt).multiplyScalar(pull); const sph = new THREE.Spherical().setFromVector3(off); sph.theta += viewOff.yaw; sph.phi = Math.min(Math.PI * 0.49, Math.max(0.2, sph.phi + viewOff.pitch));
  camera.position.copy(tgt).add(new THREE.Vector3().setFromSpherical(sph)); camera.fov = fov; camera.lookAt(tgt); camera.updateProjectionMatrix();
}
const ray = new THREE.Raycaster(); let drag = null;
function ndc(e) { const r = canvas.getBoundingClientRect(); return new THREE.Vector2(((e.clientX - r.left) / r.width) * 2 - 1, -((e.clientY - r.top) / r.height) * 2 + 1); }
canvas.style.touchAction = "none";
canvas.addEventListener("pointerdown", (e) => {
  canvas.setPointerCapture(e.pointerId); ray.setFromCamera(ndc(e), camera);
  const hit = ray.intersectObjects(view.pickables(lab.url.scene), false)[0];
  drag = { id: e.pointerId, x: e.clientX, y: e.clientY, moved: false, what: hit ? (lab.url.scene === "pull" ? "moon" : "start") : "look", yaw: viewOff.yaw, pitch: viewOff.pitch };
});
canvas.addEventListener("pointermove", (e) => {
  if (!drag || e.pointerId !== drag.id) return; const dx = e.clientX - drag.x, dy = e.clientY - drag.y; if (Math.hypot(dx, dy) > 5) drag.moved = true;
  if (drag.what === "moon") { ray.setFromCamera(ndc(e), camera); const p = new THREE.Vector3(); if (ray.ray.intersectPlane(new THREE.Plane(new THREE.Vector3(0, 0, 1), -view.s1.z), p)) moveMoon(p.x); }
  else if (drag.what === "look" && drag.moved) { viewOff.yaw = Math.max(-0.5, Math.min(0.5, drag.yaw - dx * 0.004)); viewOff.pitch = Math.max(-0.3, Math.min(0.3, drag.pitch - dy * 0.004)); }
});
const endDrag = (e) => { if (!drag || e.pointerId !== drag.id) return; if (drag.what === "moon") syncUrl(); if (drag.what === "start" || (!drag.moved && lab.url.scene === "well")) doAct("flick"); drag = null; renderPanelDom(); };
canvas.addEventListener("pointerup", endDrag); canvas.addEventListener("pointercancel", endDrag);
let lastTick = Math.round(lab.url.dist);
function moveMoon(x) {
  const d = clampDist((x - view.s1.x0) / S1.startM); if (d === lab.url.dist) return; lab.url.dist = d;
  const t = Math.round(d); if (Math.abs(d - t) < 0.04 && t !== lastTick) { lastTick = t; tick(); } renderPanelDom();
}
addEventListener("keydown", (e) => {
  if (e.target && /^(INPUT|TEXTAREA|SELECT)$/.test(e.target.tagName)) return; if (e.target && e.target.closest && e.target.closest("button") && (e.key === " " || e.key === "Enter")) return;
  const sc = lab.url.scene;
  if (/^[1-5]$/.test(e.key)) doAct("scene:" + SCENE_ORDER[+e.key - 1]);
  else if (sc === "pull" && (e.key === "ArrowRight" || e.key === "ArrowLeft")) { doAct(e.key === "ArrowRight" ? "dist:farther" : "dist:closer"); e.preventDefault(); }
  else if (e.key === " ") { doAct(sc === "pull" ? "pin" : sc === "well" ? "flick" : ""); e.preventDefault(); }
  else if ((e.key === "e" || e.key === "E") && lab.url.help >= 1) { lab.eqHidden = !lab.eqHidden; renderPanelDom(true); }
});

// ---------------- WebXR ----------------
let xrSession = null; const vrBtn = $("gfVR"), vrNote = $("gfVRNote");
const panel = new XRPanel(THREE); scene.add(panel.mesh);
async function checkXr() {
  let ok = false; if (navigator.xr && navigator.xr.isSessionSupported) { try { ok = await navigator.xr.isSessionSupported("immersive-vr"); } catch { ok = false; } }
  if (vrBtn) vrBtn.hidden = !ok; if (vrNote) vrNote.hidden = ok;
}
let placed = false;
if (vrBtn) vrBtn.addEventListener("click", async () => {
  if (xrSession) { await xrSession.end(); return; }
  try {
    const session = await navigator.xr.requestSession("immersive-vr", { optionalFeatures: ["local-floor", "bounded-floor", "hand-tracking"] });
    xrSession = session; placed = false;
    session.addEventListener("end", () => { xrSession = null; panel.mesh.visible = false; vrBtn.querySelector(".lbl").textContent = "Enter VR"; resize(); });
    camera.clearViewOffset(); await renderer.xr.setSession(session); vrBtn.querySelector(".lbl").textContent = "In VR";
  } catch (err) { xrSession = null; console.warn(err); fail("Could not start VR: " + (err && err.message ? err.message : err)); }
});
const xdrag = [null, null]; let paused = false;
function tick(src) { const srcs = src ? [src] : (xrSession ? [...xrSession.inputSources] : []); for (const s of srcs) { const h = s && s.gamepad && s.gamepad.hapticActuators && s.gamepad.hapticActuators[0]; if (h && h.pulse) h.pulse(0.4, 25); } }
const xin = renderer ? new XRInput(THREE, renderer, scene, {
  onSelectStart: (i, r) => {
    const id = panel.pick(r.origin, r.dir); if (id && id !== "panel") { doAct(id); return; } if (id === "panel") return;
    const hit = new THREE.Raycaster(r.origin, r.dir).intersectObjects(view.pickables(lab.url.scene), false)[0];
    if (hit) xdrag[i] = lab.url.scene === "pull" ? "moon" : "start";
    else if (lab.url.scene === "well") xdrag[i] = "start";
  },
  onSelectEnd: (i) => { if (xdrag[i] === "start") doAct("flick"); if (xdrag[i] === "moon") syncUrl(); xdrag[i] = null; },
  onScrubHours: (dh) => { if (paused || lab.url.scene !== "pull") return; lab.url.dist = clampDist(lab.url.dist + dh * 2); renderPanelDom(); },
  onTogglePanel: () => { panel.mesh.visible = !panel.mesh.visible; },
  onHover: (i, r) => {
    const id = panel.pick(r.origin, r.dir); if (i === 1 || id) panel.hover = id && id !== "panel" ? id : null;
    if (xdrag[i] === "moon") { const p = new THREE.Vector3(); if (new THREE.Ray(r.origin, r.dir).intersectPlane(new THREE.Plane(new THREE.Vector3(0, 0, 1), view.s1.z * -1), p)) moveMoon(p.x); }
  },
}) : null;
const padPrev = {};
function xrFrame() {
  const xc = renderer.xr.getCamera(); const hp = new THREE.Vector3(); xc.getWorldPosition(hp);
  if (!placed) { const d = new THREE.Vector3(0, 0, -1).applyQuaternion(xc.getWorldQuaternion(new THREE.Quaternion())); panel.place(hp, Math.atan2(-d.x, -d.z)); panel.mesh.visible = true; placed = true; }
  const ev = readPads(xrSession ? [...xrSession.inputSources] : [], padPrev);
  paused = ev.grip; view.paused = paused;
  if (ev.fire && lab.url.scene === "well") doAct("flick");
  if (ev.nextScene) doAct("next");
  if (ev.chip) { const ctr = controlsFor(lab).filter((c) => /^(obj|world|alt|speed):/.test(c.id) && !c.disabled); if (ctr.length) { const cur = ctr.findIndex((c) => c.on); const n = ctr[(Math.max(0, cur) + ev.chip + ctr.length) % ctr.length]; doAct(n.id); } }
  const M = sceneModel(lab); M.whyOpen = lab.whyCard; M.wrongOpen = lab.wrongCard;
  panel.draw(M, controlsFor(lab), tabsOf(), helpsOf());
  return hp;
}

// ---------------- loop ----------------
let last = performance.now();
function frame(now) {
  const dt = Math.min(0.1, Math.max(0, (now - last) / 1000)); last = now;
  const presenting = renderer.xr.isPresenting; let camPos;
  if (presenting) camPos = xrFrame(); else { flatCamera(); camPos = camera.position; }
  if (xin) xin.update(dt);
  const M = sceneModel(lab); view.update(M, lab, dt, camPos);
  if (!presenting && lab.url.scene === "well" && lab.marbles.some((m) => !m.done)) renderPanelDom();
  renderer.render(scene, camera); window.__gf.frames++;
}
if (statusEl) statusEl.hidden = true;
renderPanelDom(true); checkXr(); resize();
if (renderer) renderer.setAnimationLoop(frame);
if (lab.url.ui === false) document.body.classList.add("gf-noui");
export { lab, SORT_CARDS };
