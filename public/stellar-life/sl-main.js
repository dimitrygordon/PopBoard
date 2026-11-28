// Stellar Life Cycle VR: entry point. Renderer, camera, the lesson flow, the scenes, the page UI and WebXR.
// Desktop and phone: drag to look around the scene, wheel or pinch to move closer. Headset: Enter VR (shown only
// when immersive-vr is supported, like Night Sky), point and pinch or pull the trigger on the panel.
import * as THREE from "../vendor/three/three.module.min.js";   // the same vendored r170 build Night Sky imports
import { XRInput } from "../night-sky/ns-input.js";
import { prepareTracks, atEEP, fmtYears, about, MASS_LABEL, MASSES } from "./sl-data.js";
import { createFlow } from "./sl-flow.js";
import { drawHR, plotRect, fromXY, VIEWS } from "./sl-hr.js";
import { Scenes, scaleBar, zoomText, KM } from "./sl-scenes.js";
import { ONION } from "./sl-strokes.js";
import { uiModel, MASS_TEFF } from "./sl-ui.js";
import { XRPanel } from "./sl-xrpanel.js";
import { temperatureToSRGB } from "../night-sky/ns-astro.js";

const $ = (id) => document.getElementById(id);
const q = new URLSearchParams(location.search);
const manual = q.get("manual") === "1";   // test hook: deterministic clock for headless software GL
const statusEl = $("slStatus");
const fail = (msg) => { if (statusEl) { statusEl.hidden = false; statusEl.textContent = msg; } };

const canvas = $("slCanvas");
let renderer;
try {
  renderer = new THREE.WebGLRenderer({ canvas, antialias: true, powerPreference: "high-performance", preserveDrawingBuffer: q.has("shot") });
} catch (e) { fail("This device could not start 3D graphics (WebGL). Try another browser."); throw e; }
renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
renderer.xr.enabled = true; renderer.xr.setReferenceSpaceType("local-floor"); renderer.xr.setFramebufferScaleFactor(1.0);
renderer.setClearColor(0x050a1e, 1);
const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(48, 1, 0.05, 6000);
const world = new THREE.Group(); scene.add(world);   // XR scales and places this group; desktop leaves it at identity
const calm0 = q.get("calm") === "1" || (typeof matchMedia === "function" && matchMedia("(prefers-reduced-motion: reduce)").matches);
const uni = {
  uFlowT: { value: 0 }, uBoilT: { value: 0 }, uBoil: { value: calm0 ? 0 : 1 }, uBoilGain: { value: 1 }, uCamLocal: { value: new THREE.Vector3(0, 0, 1) }, uCosElev: { value: 1 },
  uBreathT: { value: 0 }, uBreath: { value: calm0 ? 0 : 1 },
};
const scenes = new Scenes(THREE, uni);
const bg = scenes.background(); world.add(bg.root);

// help level (teaching spec T6): 0 by default; ?help=1 or ?help=2 (level 2 only from the URL, e.g. a QR code); ?lock=1 locks it
const helpQ = Math.max(0, Math.min(2, parseInt(q.get("help") || "0", 10) || 0));
let flow = null, tracks = null;

// ---------------- hub: five mass orbs (ZAMS colours from temperatureToSRGB) ----------------
const hub = new THREE.Group(); world.add(hub); const hubOrbs = {};
MASSES.forEach((m, i) => {
  const R = { "0.2": 1.3, "1": 2.0, "3": 2.6, "15": 3.4, "40": 4.0 }[m];
  const o = scenes.glow([[R * 2.4, 0.12], [R * 1.5, 0.3], [R, 1.0], [R * 0.6, 1.0]], { useTeff: true, order: 3 }); o.material.uniforms.uTeff.value = MASS_TEFF[m];
  const l = scenes.label(MASS_LABEL[m], { size: 2.2 }); const grp = new THREE.Group(); grp.add(o, l); l.position.set(0, -R - 3, 0);
  grp.position.set((i - 2) * 13, 0, 0); hub.add(grp); hubOrbs[m] = { grp, o, l, R };
});
const hubTitle = scenes.label("Pick a starting mass", { size: 3.2 }); hubTitle.position.set(0, 12, 0); hub.add(hubTitle);
const hubNote = scenes.label("Sizes and colors here are a key, not to scale", { size: 1.6, color: "#C3C9E6", plate: false }); hubNote.position.set(0, -12, 0); hub.add(hubNote);

// ---------------- scale bar (3D, same scale as the scene) ----------------
const sbar = new THREE.Group(); world.add(sbar);
const sbarLine = new THREE.Line(new THREE.BufferGeometry().setFromPoints([new THREE.Vector3(-0.5, 0, 0), new THREE.Vector3(0.5, 0, 0), new THREE.Vector3(0.5, 0.5, 0), new THREE.Vector3(0.5, -0.5, 0)]), new THREE.LineBasicMaterial({ color: 0xE6E9F8, transparent: true, opacity: 0.85, depthTest: false, depthWrite: false }));
const sbarTick = new THREE.Line(new THREE.BufferGeometry().setFromPoints([new THREE.Vector3(-0.5, 0.5, 0), new THREE.Vector3(-0.5, -0.5, 0)]), sbarLine.material);
sbarLine.renderOrder = sbarTick.renderOrder = 41; sbarLine.frustumCulled = sbarTick.frustumCulled = false;
const sbarBody = new THREE.Group(); sbarBody.add(sbarLine, sbarTick); sbar.add(sbarBody);
const sbarLab = scenes.label("", { size: 1.4, plate: false, color: "#E6E9F8" }); sbar.add(sbarLab);

// ---------------- camera: drag to look (orbit), wheel or pinch to move closer ----------------
const D2R = Math.PI / 180;
const view = { yaw: 14 * D2R, pitch: 16 * D2R, zoom: 1 };
const ptrs = new Map(); let pinch0 = 0, zoom0 = 1, dragMoved = false, down0 = null;
canvas.style.touchAction = "none";
canvas.addEventListener("pointerdown", (e) => { canvas.setPointerCapture(e.pointerId); ptrs.set(e.pointerId, [e.clientX, e.clientY]); down0 = [e.clientX, e.clientY]; dragMoved = false; if (ptrs.size === 2) { const [a, b] = [...ptrs.values()]; pinch0 = Math.hypot(a[0] - b[0], a[1] - b[1]); zoom0 = view.zoom; } });
canvas.addEventListener("pointermove", (e) => {
  const p = ptrs.get(e.pointerId); if (!p) return;
  if (down0 && Math.hypot(e.clientX - down0[0], e.clientY - down0[1]) > 6) dragMoved = true;
  if (ptrs.size === 1 && dragMoved) { view.yaw -= (e.clientX - p[0]) * 0.006; view.pitch = Math.max(-1.35, Math.min(1.35, view.pitch + (e.clientY - p[1]) * 0.006)); }
  p[0] = e.clientX; p[1] = e.clientY;
  if (ptrs.size === 2) { const [a, b] = [...ptrs.values()]; const d = Math.hypot(a[0] - b[0], a[1] - b[1]); if (pinch0 > 0) view.zoom = Math.max(0.45, Math.min(2.2, zoom0 * pinch0 / d)); }
});
const pup = (e) => { const was = ptrs.has(e.pointerId); ptrs.delete(e.pointerId); pinch0 = 0; if (was && !dragMoved && e.type === "pointerup") tapScene(e.clientX, e.clientY); };
canvas.addEventListener("pointerup", pup); canvas.addEventListener("pointercancel", pup);
canvas.addEventListener("wheel", (e) => { e.preventDefault(); view.zoom = Math.max(0.45, Math.min(2.2, view.zoom * Math.exp(e.deltaY * 0.001))); }, { passive: false });
const ray = new THREE.Raycaster();
function tapScene(x, y) {   // hub: tap an orb to pick that mass
  if (!flow || flow.st.screen !== "hub" || flow.st.hubStep !== "pick") return;
  const r = canvas.getBoundingClientRect(); const ndc = new THREE.Vector2((x - r.left) / r.width * 2 - 1, -((y - r.top) / r.height) * 2 + 1);
  ray.setFromCamera(ndc, camera); let best = null, bd = 1e9;
  for (const [m, o] of Object.entries(hubOrbs)) { const p = o.grp.getWorldPosition(new THREE.Vector3()); const d = ray.ray.distanceToPoint(p); if (d < o.R * 1.6 * world.scale.x && d < bd) { bd = d; best = m; } }
  if (best) act("mass:" + best);
}

// ---------------- page layout: keep the scene centred in the part of the screen the cards leave free ----------------
let layout = { w: 1, h: 1, phone: false };
function resize() {
  const w = window.innerWidth, h = window.innerHeight; renderer.setSize(w, h, false); camera.aspect = w / h;
  const phone = w < 700; layout = { w, h, phone }; camera.fov = phone ? 64 : 46;
  // phone: the H-R card moves into the bottom sheet so it never covers the star; desktop: it floats bottom left
  const card = document.querySelector(".sl-hrcard"), sheet = $("slPanel");
  if (card && sheet) { if (phone && card.parentNode !== sheet) sheet.insertBefore(card, sheet.firstChild); else if (!phone && card.parentNode === sheet) document.body.insertBefore(card, sheet); }
  const panel = $("slPanel"); const pr = panel ? panel.getBoundingClientRect() : null;
  if (!phone && pr && pr.width) { const free = w - pr.width - 24; const ox = (w - free) / 2; camera.setViewOffset(w, h, ox, 0, w, h); }
  else if (phone && pr && pr.height) { const top = $("slTop") ? $("slTop").getBoundingClientRect().bottom : 0; const free = Math.max(h * 0.32, pr.top - top); const oy = (h - free) / 2 - top; camera.setViewOffset(w, h, 0, Math.max(0, oy), w, h); }
  else camera.clearViewOffset();
  camera.updateProjectionMatrix(); hrDirty = true;
}
addEventListener("resize", () => resize());

// ---------------- the H-R card (page) ----------------
const hrCanvas = $("slHR"); const hrG = hrCanvas ? hrCanvas.getContext("2d") : null; let hrDirty = true, hrKey = "";
function sizeHR() { if (!hrCanvas) return; const r = hrCanvas.getBoundingClientRect(); const dpr = Math.min(2, window.devicePixelRatio || 1); const W = Math.max(200, Math.round(r.width * dpr)), H = Math.max(160, Math.round(r.height * dpr)); if (hrCanvas.width !== W || hrCanvas.height !== H) { hrCanvas.width = W; hrCanvas.height = H; } return dpr; }
function hrModel(v) {
  const st = flow.st; const m = { help: st.help, ghosts: st.ghosts.slice(), pins: st.pins, view: "normal", title: "H-R diagram" };
  if (st.screen === "hub") { m.title = st.hubStep === "pins" || st.hubStep === "ready" ? "H-R diagram: place your pins" : "H-R diagram"; return m; }
  m.view = v.view; m.trail = v.trail; m.dot = v.dot; m.noDot = v.noDot; m.fork = v.fork; m.today = v.today; m.predictedLabel = v.predictedLabel; m.live = st.phase === "play";
  if (v.stage && v.stage.ghostSun && !st.ghosts.some((g) => g.mass === "1")) m.ghosts.push({ mass: "1", label: "1 Sun", pts: flow.trailFor("1", 1e9, true).pts });
  return m;
}
if (hrCanvas) hrCanvas.addEventListener("click", (e) => {
  if (!flow || flow.st.screen !== "hub" || flow.st.hubStep !== "pins") return;
  const r = hrCanvas.getBoundingClientRect(); const dpr = hrCanvas.width / r.width; const rect = plotRect(hrCanvas.width, hrCanvas.height, dpr);
  const x = (e.clientX - r.left) * dpr, y = (e.clientY - r.top) * dpr; if (x < rect.x || x > rect.x + rect.w || y < rect.y || y > rect.y + rect.h) return;
  flow.addPin(fromXY(VIEWS.normal, rect, x, y)); hrDirty = true; uiDirty = true;
});

// ---------------- page UI (DOM) ----------------
let uiDirty = true, uiKey = ""; const transient = { zoom: null, zoomUntil: 0, skip: null, skipUntil: 0 };
const esc = (s) => String(s).replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]));
function renderUI(M) {
  const key = JSON.stringify(M); if (key === uiKey) return; uiKey = key;
  $("slKicker").textContent = M.kicker || ""; $("slTitle").textContent = M.title || "";
  const cards = M.cards || []; $("slCaption").innerHTML = cards.length ? `<p>${esc(cards[M.cardIdx || 0])}</p>` + (cards.length > 1 ? `<div class="sl-cardnav"><span>Card ${M.cardIdx + 1} of ${cards.length}</span><button type="button" data-act="card-" ${M.cardIdx ? "" : "disabled"}>Previous</button><button type="button" data-act="card+" ${M.cardIdx < cards.length - 1 ? "" : "disabled"}>Next card</button></div>` : "") : "";
  let qh = "";
  if (M.masses) qh += `<div class="sl-masses">${M.masses.map((m) => `<button type="button" class="sl-mass${m.on ? " on" : ""}" data-act="mass:${m.id}" aria-pressed="${m.on}"><span class="dot" style="--c:${m.css}"></span>${esc(m.label)}${m.done ? ' <span class="done">run</span>' : ""}</button>`).join("")}</div>`;
  if (M.question) {
    const Q = M.question; qh += `<div class="sl-q"><p class="sl-qtext">${esc(Q.text)}</p>`;
    if (Q.kind === "massMeter") qh += `<label class="sl-meter">Your guess: <output id="slMeterOut">${Q.value.toFixed(1)} Suns</output><input type="range" id="slMeter" min="${Q.min}" max="${Q.max}" step="0.1" value="${Q.value}"></label><button type="button" class="sl-btn primary" data-act="meter:${Q.i}">Lock in my guess</button>`;
    else qh += `<div class="sl-choices">${Q.choices.map((c) => `<button type="button" class="sl-choice${c.picked ? " on" : ""}" data-act="${Q.key === "H-End" ? "end:" : "choice:" + Q.i + ":"}${esc(c.label)}">${esc(c.label)}</button>`).join("")}</div>`;
    qh += `</div>`;
  }
  if (M.pinPrompt) qh += `<p class="sl-pinprompt">${esc(M.pinPrompt)}</p>`;
  for (const r of M.reveal || []) qh += `<div class="sl-reveal"><div><span>You picked</span> ${esc(r.picked)}</div><div><span>The model</span> ${esc(r.model)}${r.extra ? ". " + esc(r.extra) : ""}</div>${r.optionalKey && !r.optional ? `<button type="button" class="sl-link" data-act="optional:${r.optionalKey}">Want to know why?</button>` : ""}${r.optional ? `<div class="sl-opt">${esc(r.optional)}</div>` : ""}</div>`;
  $("slQuestion").innerHTML = qh;
  $("slWidgets").innerHTML = (M.widgets || []).map(widgetHTML).join("");
  $("slReadouts").innerHTML = (M.readouts || []).map(([k, v]) => `<div class="sl-ro"><span>${esc(k)}</span><b>${esc(v)}</b></div>`).join("");
  $("slChips").innerHTML = (M.chips || []).map((c) => `<div class="sl-chip">${esc(c)}</div>`).join("");
  $("slCredit").textContent = M.credit || ""; $("slCredit").hidden = !M.credit;
  $("slControls").innerHTML = (M.toggles || []).map((t) => `<button type="button" class="sl-btn toggle${t.on ? " on" : ""}" data-act="${t.id}" aria-pressed="${t.on}">${esc(t.label)}</button>`).join("") +
    (M.buttons || []).map((b) => `<button type="button" class="sl-btn${b.primary ? " primary" : ""}" data-act="${b.id}" ${b.hold ? 'data-hold="1"' : ""} ${b.disabled ? "disabled" : ""}>${esc(b.label)}</button>`).join("");
  const meter = $("slMeter"); if (meter) meter.addEventListener("input", () => { $("slMeterOut").textContent = (+meter.value).toFixed(1) + " Suns"; flow.st.massGuess[flow.stage().id] = +meter.value; });
  const tb = $("slTimebar"); if (tb) tb.addEventListener("input", () => { flow.st.timebar = +tb.value; hrDirty = true; });
  resizeSoon();
}
function widgetHTML(w) {
  if (w.kind === "timebar") return `<label class="sl-timebar">${esc(w.label)}<input type="range" id="slTimebar" min="0" max="1" step="0.005" value="${w.value}"><span class="ends"><span>Giant peak</span><span>Now</span></span></label>`;
  if (w.kind === "onion") return `<div class="sl-onion"><div class="sl-wtitle">Each fuel lasts shorter than the last</div>${w.layers.map(([n, time], i) => `<div class="row${w.progress * w.layers.length > i ? " on" : ""}"><span class="sw" style="--c:${ONION_CSS[n] || "#AACDFF"}"></span><span>${esc(n)}</span><b>${esc(time)}</b></div>`).join("")}<div class="src">Times for a 15 Sun star: ${esc(w.source || "")}</div></div>`;
  if (w.kind === "bars") return `<div class="sl-bars"><div class="sl-wtitle">${esc(cap(w.label || "each fuel lasts shorter than the last"))}</div>${["hydrogen", "helium", "carbon", "neon", "oxygen", "silicon"].map((n, i) => `<div class="barrow${w.progress * 6 > i ? " on" : ""}"><span>${n}</span><div class="bar" style="width:${Math.round(100 * Math.pow(0.55, i))}%;--c:${ONION_CSS[n]}"></div></div>`).join("")}<div class="src">Bars show order only, not real lengths.</div>${w.level2 ? `<div class="src">${esc(w.level2)}</div>` : ""}</div>`;
  if (w.kind === "speedBar") { const rows = [["Car on a highway", 0.03, "about 0.03 km/s"], ["Jet airliner", 0.25, "about 0.25 km/s"], ["Supernova debris", 10000, "about 10,000 km/s"]];
    return `<div class="sl-speed"><div class="sl-wtitle">How fast is the debris?</div>${rows.map(([n, v, t]) => `<div class="barrow"><span>${n}</span><div class="bar" style="width:${Math.round(100 * (Math.log10(v) + 2.2) / 6.2)}%"></div><b>${t}</b></div>`).join("")}<div class="src">Log scale: each step is 10 times faster. The debris is about 40,000 times faster than a jet.</div></div>`; }
  if (w.kind === "coolclock") { const pct = (x) => Math.max(0, Math.min(100, 100 * x / w.max)).toFixed(2); return `<div class="sl-cool"><div class="sl-wtitle">Cooling clock${w.predicted ? " (predicted)" : ""}</div><div class="track"><div class="fill" style="width:${pct(w.age)}%"></div><div class="tick" style="left:${pct(13.8e9)}%"></div></div><div class="ends"><span>Star's age: ${esc(fmtYears(w.age))}</span><span>Tick: the universe today, 13.8 billion years</span></div></div>`; }
  if (w.kind === "card2") return `<details class="sl-card2"><summary>${esc(w.title || "More")}</summary>${(w.lines || []).map((l) => `<p>${esc(l)}</p>`).join("")}${w.extra ? `<p>${esc(w.extra)}</p>` : ""}</details>`;
  return "";
}
const cap = (t) => t.charAt(0).toUpperCase() + t.slice(1);
const ONION_CSS = Object.fromEntries(ONION);
let resizeT = 0; function resizeSoon() { clearTimeout(resizeT); resizeT = setTimeout(resize, 30); }
document.addEventListener("click", (e) => { const b = e.target.closest && e.target.closest("[data-act]"); if (!b || b.disabled || b.dataset.hold) return; act(b.dataset.act); });
document.addEventListener("pointerdown", (e) => { const b = e.target.closest && e.target.closest("[data-hold]"); if (b && flow) { flow.st.peek = true; const off = () => { flow.st.peek = false; removeEventListener("pointerup", off); removeEventListener("pointercancel", off); }; addEventListener("pointerup", off); addEventListener("pointercancel", off); } });
addEventListener("keydown", (e) => { if (!flow || (e.target && /^(INPUT|TEXTAREA|SELECT)$/.test(e.target.tagName))) return; if (e.key === "ArrowRight") act("next"); if (e.key === "ArrowLeft") act("prev"); if (e.key === " " && !(e.target && e.target.closest && e.target.closest("button"))) { e.preventDefault(); act("play"); } });

function act(id) {
  if (!flow) return; const st = flow.st; const [k, a, b] = id.split(":"); const rest = id.slice(id.indexOf(":") + 1);
  if (k === "mass") flow.pickMass(a);
  else if (k === "end") flow.answerHub(rest);
  else if (k === "pinUndo") flow.undoPin();
  else if (k === "start") { flow.start(); onStageChange(); }
  else if (k === "choice") flow.commit(+a, id.split(":").slice(2).join(":"));
  else if (k === "meter") flow.commit(+a, st.massGuess[flow.stage().id] != null ? st.massGuess[flow.stage().id] : (flow.pending().a.min + flow.pending().a.max) / 2);
  else if (k === "play") { if (st.phase === "play") st.playing = !st.playing; }
  else if (k === "replay") { st.t = 0; st.phase = "play"; st.playing = true; }
  else if (k === "next") { const r = flow.next(); if (r && r.skipped > 0) { transient.skip = `Skipped about ${fmtYears(r.skipped)}`; transient.skipUntil = clock + 4; } onStageChange(); }
  else if (k === "prev") { flow.prev(); onStageChange(); }
  else if (k === "hub") { flow.toHub(); onStageChange(); }
  else if (k === "skipForm") st.skipFormation = !st.skipFormation;
  else if (k === "toggle") st.toggles[a] = !st.toggles[a];
  else if (k === "card+") st.cardIdx++;
  else if (k === "card-") st.cardIdx = Math.max(0, st.cardIdx - 1);
  else if (k === "optional") st.optionalShown[rest] = true;
  else if (k === "calm") setCalm(!calm);
  else if (k === "help") { const h = (st.help + 1) % 2; flow.setHelp(h); }
  uiDirty = true; hrDirty = true;
}

// ---------------- Calm lines (boil and breathing off; flow keeps a slow drift) ----------------
let calm = calm0;
function setCalm(on) { calm = !!on; uni.uBoil.value = on ? 0 : 1; uni.uBreath.value = on ? 0 : 1; const b = $("slCalm"); if (b) { b.setAttribute("aria-pressed", on ? "true" : "false"); b.classList.toggle("on", on); } uiDirty = true; }
if ($("slCalm")) $("slCalm").addEventListener("click", () => setCalm(!calm));
setCalm(calm);
const helpBtn = $("slHelp");
function syncHelp() { if (!helpBtn || !flow) return; helpBtn.textContent = flow.st.help >= 2 ? "Numbers: level 2" : flow.st.help ? "Numbers: on" : "Numbers: off"; helpBtn.setAttribute("aria-pressed", flow.st.help ? "true" : "false"); helpBtn.disabled = flow.st.lockHelp || flow.st.help >= 2; }
if (helpBtn) helpBtn.addEventListener("click", () => { act("help"); syncHelp(); });

// ---------------- scene switching and zoom labels ----------------
let cur = null, curKey = "", lastKm = null;
function sceneFor(v) {
  if (!flow || flow.st.screen === "hub") return null;
  const kind = v.sceneKind || v.stage.scene; return scenes.get(kind, flow.st.mass);
}
function onStageChange() { uiDirty = true; hrDirty = true; flow && (flow.st.cardIdx = Math.max(0, flow.st.cardIdx)); }
function showScene(sc) {
  const key = sc ? sc.kind + (sc.kind === "disk" ? flow.st.mass : "") : "hub";
  if (key === curKey) return; if (cur) world.remove(cur.root); cur = sc; curKey = key;
  hub.visible = !sc; if (sc) { world.add(sc.root); if (sc.kind === "star" && flow) { const v = flow.view(); if (v.row) sc.reset(Math.pow(10, v.row.logR)); } }
}

// ---------------- WebXR (Night Sky pattern: the button shows only when immersive-vr is supported) ----------------
let xrSession = null; const vrBtn = $("slVR"), vrNote = $("slVRNote");
const panel = new XRPanel(THREE); scene.add(panel.mesh);
async function checkXr() {
  let ok = false; if (navigator.xr && navigator.xr.isSessionSupported) { try { ok = await navigator.xr.isSessionSupported("immersive-vr"); } catch { ok = false; } }
  if (vrBtn) vrBtn.hidden = !ok; if (vrNote) vrNote.hidden = ok;
}
const xrPlace = { pos: new THREE.Vector3(0, 1.45, -2.3) };
function placeForXr(on) {
  if (!on) { world.scale.setScalar(1); world.position.set(0, 0, 0); world.quaternion.identity(); panel.mesh.visible = false; return; }
  panel.mesh.visible = true; placed = false;
}
let placed = false;
if (vrBtn) vrBtn.addEventListener("click", async () => {
  if (xrSession) { await xrSession.end(); return; }
  try {
    const session = await navigator.xr.requestSession("immersive-vr", { optionalFeatures: ["local-floor", "bounded-floor", "hand-tracking"] });
    xrSession = session; session.addEventListener("end", () => { xrSession = null; placeForXr(false); vrBtn.querySelector(".lbl").textContent = "Enter VR"; resize(); });
    camera.clearViewOffset(); await renderer.xr.setSession(session); placeForXr(true); vrBtn.querySelector(".lbl").textContent = "In VR";
  } catch (err) { xrSession = null; console.warn(err); fail("Could not start VR: " + (err && err.message ? err.message : err)); }
});
const xin = new XRInput(THREE, renderer, scene, {
  onSelectStart: (i, r) => { const id = panel.pick(r.origin, r.dir); if (id && id !== "panel" && id !== "hr") { if (id === "peek") flow.st.peek = true; else act(id); } else if (id === "hr") { const pt = hrPointFromRay(r); if (pt) { flow.addPin(pt); uiDirty = hrDirty = true; } } else if (!id && flow && flow.st.screen === "hub") xrPickOrb(r); },
  onSelectEnd: () => { if (flow) flow.st.peek = false; },
  onScrubHours: () => {},
  onTogglePanel: () => { panel.mesh.visible = !panel.mesh.visible; },
  onHover: (i, r) => { const id = panel.pick(r.origin, r.dir); if (panel.hover !== id) { panel.hover = id; uiDirty = true; } xin.setRayLength(i, id ? 1 : 5); },
});
function hrPointFromRay(r) { panel.ray.set(r.origin, r.dir); const h = panel.ray.intersectObject(panel.mesh, false)[0]; if (!h) return null; const x = h.uv.x * 1024 - 20, y = (1 - h.uv.y) * 1400 - 20; const rect = plotRect(panel.hr.width, panel.hr.height, 2.1); if (x < rect.x || x > rect.x + rect.w || y < rect.y || y > rect.y + rect.h) return null; return fromXY(VIEWS.normal, rect, x, y); }
function xrPickOrb(r) { let best = null, bd = 1e9; for (const [m, o] of Object.entries(hubOrbs)) { const p = o.grp.getWorldPosition(new THREE.Vector3()); const d = new THREE.Ray(r.origin, r.dir).distanceToPoint(p); if (d < o.R * 1.6 * world.scale.x && d < bd) { bd = d; best = m; } } if (best) act("mass:" + best); }

// ---------------- frame loop ----------------
const tmp = new THREE.Vector3(), camLocal = new THREE.Vector3(), qW = new THREE.Quaternion(), qL = new THREE.Quaternion(), wq = new THREE.Quaternion();
let prev = 0, clock = 0, flowT = 0, boilT = 0;
const stats = { frames: 0, acc: 0, fps: 0, ms: 0, cpu: 0, cpuAcc: 0, samples: [] };
function frame(now) {
  const dt = (prev && !manual) ? Math.min(0.1, (now - prev) / 1000) : (manual ? manualDt : 0); prev = now; clock += dt;
  if (!calm) boilT += dt; flowT += dt * (calm ? 0.35 : 1);
  uni.uBoilT.value = boilT; uni.uFlowT.value = flowT; uni.uBreathT.value = flowT;
  if (!flow) { renderer.render(scene, camera); return; }
  const before = flow.st.phase; flow.tick(dt); if (flow.st.phase !== before) uiDirty = true;
  const v = flow.st.screen === "stage" ? flow.view() : null;
  const sc = sceneFor(v); showScene(sc);
  const presenting = renderer.xr.isPresenting;
  // XR placement: the scene floats about 2.3 m ahead at eye height, sized so the scene fills a comfortable view
  if (presenting) {
    const xc = renderer.xr.getCamera(); xc.getWorldPosition(tmp);
    if (!placed) { const d = new THREE.Vector3(0, 0, -1).applyQuaternion(xc.getWorldQuaternion(wq)); const yaw = Math.atan2(-d.x, -d.z); xrPlace.pos.set(tmp.x - Math.sin(yaw) * 2.3, Math.max(1.2, tmp.y), tmp.z - Math.cos(yaw) * 2.3); xrPlace.yaw = yaw; panel.place(tmp, yaw); placed = true; }
    const dist = sc ? sc.camDist : 80; world.scale.setScalar(1.9 / dist); world.position.copy(xrPlace.pos); world.rotation.set(0, xrPlace.yaw || 0, 0);
  } else {
    const fit = layout.phone ? Math.max(1.15, 0.95 / Math.max(0.3, camera.aspect)) : camera.aspect < 1.2 ? 1.2 : 1;   // portrait: fit the scene across the narrow width
    const dist = (sc ? sc.camDist : 80) * view.zoom * fit; const cp = Math.cos(view.pitch);
    camera.position.set(Math.sin(view.yaw) * cp, Math.sin(view.pitch), Math.cos(view.yaw) * cp).multiplyScalar(dist); camera.lookAt(0, 0, 0);
  }
  const cam = presenting ? renderer.xr.getCamera() : camera;
  world.updateMatrixWorld(true); cam.getWorldPosition(tmp); camLocal.copy(tmp); world.worldToLocal(camLocal);
  cam.getWorldQuaternion(qW); world.getWorldQuaternion(wq); qL.copy(wq).invert().multiply(qW);
  uni.uCamLocal.value.copy(camLocal); uni.uCosElev.value = Math.max(0.25, Math.hypot(camLocal.x, camLocal.z) / (camLocal.length() || 1));
  bg.root.position.copy(camLocal);   // the sky stays at infinity
  const extra = {};
  if (sc) sc.update({ v, st: flow.st, help: flow.st.help, calm, now: performance.now(), time: clock, dt, camLocal, camQuatLocal: qL, extra });
  else for (const [m, o] of Object.entries(hubOrbs)) { o.grp.scale.setScalar(flow.st.mass === m ? 1.18 : 1); o.l.quaternion.copy(qL); }
  hubTitle.quaternion.copy(qL);
  // scale bar and zoom labels (labelled zoom changes, never a fake scale)
  const km = sc && sc.kmPerUnit ? sc.kmPerUnit() : null;
  if (km && lastKm && Math.abs(Math.log10(km / lastKm)) > 0.05) { const t = zoomText(lastKm, km); if (t) { transient.zoom = t; transient.zoomUntil = clock + 4; uiDirty = true; } }
  if (km) lastKm = km;
  const bar = km ? scaleBar(km, (sc.radius || 10) * 0.8) : null; sbar.visible = !!bar && !(sc && (sc.kind === "twopaths"));
  if (bar) { sbarBody.scale.set(bar.units, Math.max(0.6, (sc.radius || 10) * 0.05), 1); scenes.setLabel(sbarLab, bar.label); sbar.quaternion.copy(qL); sbar.position.copy(new THREE.Vector3(0, -((sc.radius || 10) * 1.3 + 4), 0).applyQuaternion(qL)); sbarLab.position.set(0, -1.6, 0); }
  if (transient.zoom && clock > transient.zoomUntil) { transient.zoom = null; uiDirty = true; }
  if (transient.skip && clock > transient.skipUntil) { transient.skip = null; uiDirty = true; }
  // UI
  if (flow.st.phase === "play" || uiDirty) {
    const M = uiModel(flow, { view: v || undefined, calm, zoom: transient.zoom, skip: transient.skip, sceneChips: sc && sc.chips, stageSpan: v ? stageSpan() : null });
    if (M.masses) M.masses.forEach((m) => { const c = scenes.T && temperatureCss(m.teff); m.css = c; });
    if (!presenting) renderUI(M); else panel.draw(M, hrModel(v || {}), performance.now(), uiDirty);
    uiDirty = false; window.__stellarUI = M;
  }
  if (!presenting && hrG && (hrDirty || flow.st.phase === "play")) { const dpr = sizeHR(); const m = hrModel(v || {}); const k = JSON.stringify([m.dot, m.trail && m.trail.map((t) => t.pts.length), m.pins, m.view, m.help, hrCanvas.width, hrCanvas.height, m.ghosts.length, m.noDot, m.fork]); if (k !== hrKey || hrDirty) { drawHR(hrG, hrCanvas.width, hrCanvas.height, m, dpr * (layout.phone ? 0.82 : 1)); hrKey = k; } hrDirty = false; }
  if (presenting) xin.update(dt);
  const t0 = performance.now(); renderer.render(scene, camera); const cpu = performance.now() - t0;
  const dtf = dt * 1000; stats.frames++; stats.acc += dtf; stats.cpuAcc += cpu; if (dtf > 0 && dtf < 1000) stats.samples.push(dtf);
  if (stats.acc >= 500) { stats.ms = stats.acc / stats.frames; stats.fps = 1000 / stats.ms; stats.cpu = stats.cpuAcc / stats.frames; stats.frames = 0; stats.acc = 0; stats.cpuAcc = 0; }
}
function stageSpan() {
  const st = flow.st; const r = st.ranges[st.si]; if (!r) return null; const tr = tracks[st.mass]; const a = atEEP(tr, r[0]).age, b = atEEP(tr, r[1]).age; return b > a ? fmtYears(b - a) : null;
}

function temperatureCss(T) { const c = temperatureToSRGB(T).map((x) => Math.round(Math.max(0, Math.min(1, x)) * 255)); return `rgb(${c[0]},${c[1]},${c[2]})`; }

let manualDt = 0;
async function boot() {
  try {
    const [tj, sj] = await Promise.all([fetch("stellar-life/data/tracks.json?v=1").then((r) => r.json()), fetch("stellar-life/data/stages.json?v=1").then((r) => r.json())]);
    tracks = prepareTracks(tj); flow = createFlow(sj, tracks, { help: 0, lockHelp: q.get("lock") === "1" });
    if (helpQ) flow.setHelp(helpQ, true); syncHelp();
    resize(); if (statusEl) statusEl.hidden = true;
    if (!manual) renderer.setAnimationLoop(frame); else frame(0);
  } catch (e) { console.error(e); fail("Could not load the star data. Check your connection and reload."); }
}
checkXr(); resize(); boot();

// ---------------- test hook (headless checks; no effect on students) ----------------
window.__stellar = {
  THREE_REVISION: THREE.REVISION,
  get flow() { return flow; }, act, setCalm, view, scenes, uni,
  /** Jump straight to a stage (by id) of a mass at fraction t, answering any predictions with the first choice. */
  goto(mass, id, t = 1) {
    flow.toHub(); flow.st.skipFormation = false; flow.pickMass(mass); flow.answerHub("white dwarf"); for (let i = 0; i < 3; i++) flow.addPin({ logT: 3.8, logL: i }); flow.start();
    const i = flow.st.stages.findIndex((s) => s.id === id); if (i < 0) throw new Error("no stage " + id); flow.enter(i);
    let p; let guard = 0; while ((p = flow.pending()) && guard++ < 6) flow.commit(p.i, p.a.kind === "massMeter" ? (p.a.min + p.a.max) / 2 : (p.a.choices || ["Explode first"])[0]);
    flow.setT(t); uiDirty = hrDirty = true; lastKm = null; transient.zoom = null; return flow.view();
  },
  renderAt(tSec, dt = 1 / 60) { manualDt = dt; flowT = tSec; boilT = calm ? boilT : tSec; frame(tSec * 1000); },
  info: () => ({ calls: renderer.info.render.calls, triangles: renderer.info.render.triangles, scene: cur ? cur.kind : "hub", strokes: (cur ? cur.strokes : 0) + bg.strokes, sceneStrokes: cur ? cur.strokes : 0, skyStrokes: bg.strokes }),
  frameStats: () => ({ ...stats, samples: stats.samples.length }),
  canvas, renderer, camera, world, get panel() { return panel; },
  /** CSS px of the current star body's centre, plus the Teff the scene is drawing (for the hue check). */
  centerOf() {
    const b = cur && cur.body ? cur.body : cur ? cur.root : hub; const p = b.getWorldPosition(new THREE.Vector3()).project(camera); const r = canvas.getBoundingClientRect();
    const v = flow && flow.st.screen === "stage" ? flow.view() : null; const row = v ? (v.cooling || v.row) : null;
    return { x: r.left + (p.x + 1) / 2 * r.width, y: r.top + (1 - p.y) / 2 * r.height, teff: row ? Math.pow(10, row.logT) : null, radiusPx: cur && cur.radius ? cur.radius : null, scene: cur ? cur.kind : "hub" };
  },
};
