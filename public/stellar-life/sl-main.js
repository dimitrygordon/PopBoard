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
import { ZONES, cardComplete, FRAME_WORDS, TICKET, logPos, LOGCLOCK, COMPARE_TEXT } from "./sl-compare.js";
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
  renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true, powerPreference: "high-performance", preserveDrawingBuffer: q.has("shot") });
} catch (e) { fail("This device could not start 3D graphics (WebGL). Try another browser."); throw e; }
renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
renderer.xr.enabled = true; renderer.xr.setReferenceSpaceType("local-floor"); renderer.xr.setFramebufferScaleFactor(1.0);
renderer.setClearColor(0x050a1e, 0);   // the navy to violet wash of the style-B frames is the page background (sl.css); the headset clears its own
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
// tier (teaching spec 8): ?tier=1 (more support: help level 1, highlighted H-R zones, two choices, the sentence frame), 2 (default) or 3
const tierQ = [1, 2, 3].includes(+q.get("tier")) ? +q.get("tier") : 2;
let flow = null, tracks = null;

// ---------------- hub: five mass orbs (ZAMS colours from temperatureToSRGB) ----------------
const hub = new THREE.Group(); world.add(hub); const hubOrbs = {};
MASSES.forEach((m, i) => {
  const R = { "0.2": 1.3, "1": 2.0, "3": 2.6, "15": 3.4, "40": 4.0 }[m];
  const o = scenes.glow([[R * 2.4, 0.12], [R * 1.5, 0.3], [R, 1.0], [R * 0.6, 1.0]], { useTeff: true, order: 3 }); o.material.uniforms.uTeff.value = MASS_TEFF[m];
  const l = scenes.label(MASS_LABEL[m], { size: 2.2 }); const grp = new THREE.Group(); grp.add(o, l); l.position.set(0, -R - 3, 0);
  grp.position.set((i - 2) * 13, 0, 0); hub.add(grp); hubOrbs[m] = { grp, o, l, R, i };
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
  const dock = $("slDock"); if (dock && sheet) { if (phone && dock.parentNode !== sheet) sheet.insertBefore(dock, sheet.firstChild); else if (!phone && dock.parentNode === sheet) document.body.insertBefore(dock, sheet); }
  const panel = $("slPanel"); const pr = panel ? panel.getBoundingClientRect() : null;
  const cr = card && !phone ? card.getBoundingClientRect() : null; layout.panel = pr; layout.card = cr && cr.width ? cr : null; layout.off = null;
  if (!phone && pr && pr.width) { const free = w - pr.width - 24; const ox = (w - free) / 2; camera.setViewOffset(w, h, ox, 0, w, h); layout.off0 = [ox, 0]; }
  else if (phone && pr && pr.height) { const top = $("slTop") ? $("slTop").getBoundingClientRect().bottom : 0; const free = Math.max(h * 0.32, pr.top - top); const oy = (h - free) / 2 - top; camera.setViewOffset(w, h, 0, Math.max(0, oy), w, h); layout.off0 = [0, Math.max(0, oy)]; layout.free = { top, bottom: top + free }; }
  else { camera.clearViewOffset(); layout.off0 = [0, 0]; }
  layout.offKey = null;
  camera.updateProjectionMatrix(); hrDirty = true;
}
addEventListener("resize", () => resize());

// ---------------- the H-R card (page) ----------------
const hrCanvas = $("slHR"); const hrG = hrCanvas ? hrCanvas.getContext("2d") : null; let hrDirty = true, hrKey = "";
function sizeHR() { if (!hrCanvas) return; const r = hrCanvas.getBoundingClientRect(); const dpr = Math.min(2, window.devicePixelRatio || 1); const W = Math.max(200, Math.round(r.width * dpr)), H = Math.max(160, Math.round(r.height * dpr)); if (hrCanvas.width !== W || hrCanvas.height !== H) { hrCanvas.width = W; hrCanvas.height = H; } return dpr; }
function hrModel(v) {
  const st = flow.st; const m = { help: st.help, ghosts: st.ghosts.slice(), pins: st.pins, view: "normal", title: "H-R diagram" };
  if (st.screen === "hub") { m.title = st.hubStep === "pins" || st.hubStep === "ready" ? "H-R diagram: place your pins" : "H-R diagram"; if (st.tier === 1 && st.hubStep === "pins") m.zones = ZONES; return m; }
  if (st.screen === "compare") { const C = flow.cmp; m.title = "H-R diagram: two stars"; if (C.c.step === "run" || C.c.step === "done") { m.trail = []; m.dots = [];
      for (const mm of C.sorted()) { const s = C.starAt(mm); const tr = tracks[mm]; m.trail.push({ pts: tr.rows.filter((r) => r.eep >= tr.zams.eep && r.eep <= s.row.eep).map((r) => ({ logT: r.logT, logL: r.logL })).concat([{ logT: s.row.logT, logL: s.row.logL }]) }); m.dots.push({ logT: s.row.logT, logL: s.row.logL, label: MASS_LABEL[mm] }); } }
    return m; }
  if (st.screen !== "stage") return m;
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
  renderSheet(M.sheet);
  $("slKicker").textContent = M.kicker || ""; $("slTitle").textContent = M.title || "";
  const cards = M.cards || []; $("slCaption").innerHTML = cards.length ? `<p>${esc(cards[M.cardIdx || 0])}</p>` + (M.readAloud && window.speechSynthesis ? `<button type="button" class="sl-link sl-read" data-act="readAloud">Read aloud</button>` : "") + (cards.length > 1 ? `<div class="sl-cardnav"><span>Card ${M.cardIdx + 1} of ${cards.length}</span><button type="button" data-act="card-" ${M.cardIdx ? "" : "disabled"}>Previous</button><button type="button" data-act="card+" ${M.cardIdx < cards.length - 1 ? "" : "disabled"}>Next card</button></div>` : "") : "";
  let qh = "";
  // the pin prompt (and the Tier 1 zone hint) come before the mass tiles, so on phone they sit above the fold
  if (M.pinPrompt) qh += `<p class="sl-pinprompt">${esc(M.pinPrompt)}</p>`;
  if (M.pinChip) qh += `<div class="sl-chip sl-pinchip">${esc(M.pinChip)}</div>`;
  if (M.masses) qh += `<div class="sl-masses">${M.masses.map((m) => `<button type="button" class="sl-mass${m.on ? " on" : ""}" data-act="${m.act || "mass:" + m.id}" aria-pressed="${m.on}"><span class="dot" style="--c:${m.css}"></span>${esc(m.label)}${m.done ? ' <span class="done">run</span>' : ""}</button>`).join("")}</div>`;
  if (M.question) {
    const Q = M.question; qh += `<div class="sl-q"><p class="sl-qtext">${esc(Q.text)}</p>`;
    if (Q.kind === "massMeter") qh += `<label class="sl-meter">Your guess: <output id="slMeterOut">${Q.value.toFixed(1)} Suns</output><input type="range" id="slMeter" min="${Q.min}" max="${Q.max}" step="0.1" value="${Q.value}"></label><button type="button" class="sl-btn primary" data-act="meter:${Q.i}">Lock in my guess</button>`;
    else qh += `<div class="sl-choices">${Q.choices.map((c) => `<button type="button" class="sl-choice${c.picked ? " on" : ""}" data-act="${c.act ? esc(c.act) : (Q.key === "H-End" ? "end:" : "choice:" + Q.i + ":") + esc(c.label)}">${esc(c.label)}</button>`).join("")}</div>`;
    qh += `</div>`;
  }
  for (const r of M.reveal || []) qh += `<div class="sl-reveal">${r.q ? `<p class="sl-rq">${esc(r.q)}</p>` : ""}<div><span>You picked</span> ${esc(r.picked)}</div><div><span>The model</span> ${esc(r.model)}${r.extra ? ". " + esc(r.extra) : ""}</div>${r.optionalKey && !r.optional ? `<button type="button" class="sl-link" data-act="optional:${r.optionalKey}">Want to know why?</button>` : ""}${r.optional ? `<div class="sl-opt">${esc(r.optional)}</div>` : ""}</div>`;
  $("slQuestion").innerHTML = qh;
  const docked = (M.widgets || []).filter((w) => w.kind === "logclock");   // the COMPARE clock sits at the bottom of the view (above the fold on phone)
  $("slWidgets").innerHTML = (M.widgets || []).filter((w) => w.kind !== "logclock").map(widgetHTML).join("");
  const dock = $("slDock"); if (dock) { dock.innerHTML = docked.map(widgetHTML).join(""); dock.hidden = !docked.length; }
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
  if (w.kind === "logclock") return `<div class="sl-logclock"><div class="sl-wtitle">Age <span class="lc-sub">log clock: each notch is 10 times longer</span></div><div class="lc-track">${Array.from({ length: w.y1 - w.y0 + 1 }, (_, i) => `<span class="lc-notch" style="left:${(100 * i / (w.y1 - w.y0)).toFixed(2)}%"></span>`).join("")}${w.ticks.map((k) => `<span class="lc-tick" style="left:${(100 * k.p).toFixed(2)}%" title="${esc(k.label)}"></span>`).join("")}${w.stars.map((s, i) => `<span class="lc-star" style="left:${(100 * s.p).toFixed(2)}%;--c:${temperatureCss(s.teff)};--row:${i}"></span>${s.life != null ? `<span class="lc-life" style="left:${(100 * s.life).toFixed(2)}%;--row:${i}"></span>` : ""}`).join("")}</div><div class="lc-ends"><span>100,000 years</span><span>10 trillion years</span></div><div class="lc-keys">${w.ticks.map((k) => `<span><i class="lc-tick-key"></i>${esc(k.label)}</span>`).join("")}${w.stars.map((s) => `<span><i class="lc-star-key" style="--c:${temperatureCss(s.teff)}"></i>${esc(s.label)}${s.life != null ? ": main sequence " + esc(s.lifeLabel) + ", fusion ends " + esc(s.endLabel) : ""}</span>`).join("")}</div></div>`;
  if (w.kind === "readoff") return `<div class="sl-readoff"><div class="sl-wtitle">Read off the model</div><table><thead><tr><th>Mass</th><th>Age</th><th>Color</th><th>End</th></tr></thead><tbody>${w.rows.map((r) => `<tr class="r1"><th scope="rowgroup" rowspan="2">${esc(r.label)}</th><td>Main sequence (hydrogen in the core): ${esc(r.life)}</td><td rowspan="2">${esc(r.color)}</td><td rowspan="2">${esc(r.end)}</td></tr><tr class="r2"><td>Fusion ends: ${esc(r.fusionEnd)}</td></tr>`).join("")}</tbody></table></div>`;
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

// ---------------- the Mass Card and the exit ticket: a full page sheet (also the printed page) ----------------
const sheetEl = document.getElementById("slSheet"); let sheetKey = "";
function renderSheet(sh) {
  if (!sheetEl) return; document.body.classList.toggle("sl-has-sheet", !!sh);
  if (!sh) { if (sheetKey) { sheetEl.hidden = true; sheetEl.innerHTML = ""; sheetKey = ""; } return; }
  const k = JSON.stringify(sh); if (k === sheetKey) return; sheetKey = k;
  const focus = document.activeElement && sheetEl.contains(document.activeElement) ? { id: document.activeElement.id, s: document.activeElement.selectionStart, e: document.activeElement.selectionEnd } : null;
  sheetEl.hidden = false; sheetEl.innerHTML = sh.kind === "card" ? cardHTML(sh) : ticketHTML();
  if (focus && focus.id) { const el = document.getElementById(focus.id); if (el) { el.focus(); try { if (focus.s != null) el.setSelectionRange(focus.s, focus.e); } catch (e) { /* selects have no caret */ } } }
}
function sel(id, opts, val, label) { return `<select id="${id}" data-card="${id}" aria-label="${esc(label)}"><option value="">Choose</option>${opts.map((o) => `<option${o === val ? " selected" : ""}>${esc(o)}</option>`).join("")}</select>`; }
function cardHTML(sh) {
  const card = flow.st.card;
  const rows = sh.rows.map((r) => { const v = card.rows[r.mass]; return `<tr class="${r.core ? "core" : ""}"><th scope="row"><span class="dot" style="--c:${temperatureCss(MASS_TEFF[r.mass])}"></span>${esc(r.label)}${r.core ? ' <span class="req">core</span>' : ""}${r.run ? "" : ' <span class="norun">not run yet</span>'}</th>
    <td data-l="Lifetime">${sel(`c-${r.mass}-life`, sh.options.life, v.life, r.label + " lifetime")}</td><td data-l="Color">${sel(`c-${r.mass}-color`, sh.options.color, v.color, r.label + " color")}</td><td data-l="End state">${sel(`c-${r.mass}-end`, sh.options.end, v.end, r.label + " end state")}</td></tr>`; }).join("");
  const sentence = sh.tier === 1
    ? `<p class="frame"><b>Sentence frame:</b> ${esc(sh.frame)}</p><div class="fill">The <input id="c-frame-0" data-card="frame:0" list="slW0" value="${esc(card.frame[0])}" aria-label="first blank" placeholder="___"> the mass, the <input id="c-frame-1" data-card="frame:1" list="slW1" value="${esc(card.frame[1])}" aria-label="second blank" placeholder="___"> the life, because <input id="c-frame-2" class="wide" data-card="frame:2" value="${esc(card.frame[2])}" aria-label="because" placeholder="___">.</div><datalist id="slW0">${sh.frameWords[0].map((w) => `<option value="${w}">`).join("")}</datalist><datalist id="slW1">${sh.frameWords[1].map((w) => `<option value="${w}">`).join("")}</datalist>`
    : `<div class="fill">Mass decides <input id="c-decides" class="wide" data-card="sentence:decides" value="${esc(card.decides)}" aria-label="Mass decides" placeholder="___"> because <input id="c-because" class="wide" data-card="sentence:because" value="${esc(card.because)}" aria-label="because" placeholder="___">.</div>`;
  return `<div class="sl-sheet-in"><header><h2>Mass Card</h2><div class="sheet-btns"><button type="button" class="sl-btn" data-act="print">Print or save as PDF</button><button type="button" class="sl-btn" data-act="hub">Close</button></div></header><p class="cardline">${esc(COMPARE_TEXT.card)}</p>
    <table class="mc"><thead><tr><th>Starting mass</th><th>Lifetime (main sequence)</th><th>Color</th><th>End state</th></tr></thead><tbody>${rows}</tbody></table>
    <div class="sentence">${sentence}</div><p class="printline">${esc(sh.sentence)}</p>
    <p class="status ${sh.complete ? "ok" : ""}" aria-live="polite">${sh.complete ? "Card complete." : "Complete when 1, 15 and 40 plus a third mass are filled and the sentence has both blanks filled."}</p>
    <p class="note">Nothing is saved or sent. Print the card or save it as a PDF.</p></div>`;
}
function starSVG(teff, r, x, y, sticker) { const c = temperatureCss(teff); return `<circle cx="${x}" cy="${y}" r="${r * 1.6}" fill="${c}" opacity="0.18"/><circle cx="${x}" cy="${y}" r="${r}" fill="${c}" stroke="#222" stroke-width="1"/>${sticker ? `<rect x="${x + r * 0.5}" y="${y - r - 12}" width="34" height="16" rx="4" fill="#fff" stroke="#333"/><text x="${x + r * 0.5 + 17}" y="${y - r}" font-size="11" text-anchor="middle" fill="#222">Sun</text>` : ""}`; }
function ticketHTML() {
  const T = TICKET; const tm = { "0.2": [MASS_TEFF["0.2"], 9], "1": [MASS_TEFF["1"], 16], "15": [MASS_TEFF["15"], 30] };
  const SX = [330, 450, 590], SY = 80;   // stars spaced well apart; each arrow runs all the way to its star's edge
  const top = `<svg viewBox="0 0 680 150" role="img" aria-label="A dark cloud with arrows to three stars: A 0.2 Suns, B 1 Sun, C 15 Suns"><defs><marker id="ar" markerWidth="8" markerHeight="8" refX="7" refY="4" orient="auto"><path d="M0 0 L8 4 L0 8z" fill="#333"/></marker></defs>
    <ellipse cx="90" cy="80" rx="75" ry="52" fill="#2a2633"/><ellipse cx="70" cy="65" rx="40" ry="28" fill="#3a3445"/>
    ${T.stars.map((s, i) => { const [teff, r] = tm[s.mass]; const x = SX[i], y = SY; const ang = Math.atan2(y - 80, x - 168); const ex = x - Math.cos(ang) * (r + 5), ey = y - Math.sin(ang) * (r + 5);
      return `<path d="M168 80 Q ${(168 + ex) / 2} ${80 + (i - 1) * 34} ${ex.toFixed(1)} ${ey.toFixed(1)}" fill="none" stroke="#333" stroke-width="2" marker-end="url(#ar)"/>` + starSVG(teff, r, x, y, s.mass === "1") + `<text x="${x}" y="${y + 52}" font-size="15" font-weight="700" text-anchor="middle" fill="#111">${s.label} <tspan font-weight="500">${esc(s.note)}</tspan></text>`; }).join("")}</svg>`;
  const notches = Array.from({ length: LOGCLOCK.y1 - LOGCLOCK.y0 + 1 }, (_, i) => i);
  const bars = T.stars.map((s, i) => `<g transform="translate(40 ${14 + i * 34})"><text x="-26" y="16" font-size="14" font-weight="700" fill="#111">${s.label}</text><rect x="0" y="2" width="520" height="18" fill="#fff" stroke="#333"/>${notches.map((n) => `<line x1="${520 * n / (notches.length - 1)}" y1="0" x2="${520 * n / (notches.length - 1)}" y2="22" stroke="#666"/>`).join("")}</g>`).join("");
  const clock = `<svg viewBox="0 0 600 150" role="img" aria-label="Three empty bars on a log clock from 100,000 years to 10 trillion years">${bars}<text x="40" y="126" font-size="12" fill="#222">100,000 years</text><text x="560" y="126" font-size="12" text-anchor="end" fill="#222">10 trillion years</text><text x="300" y="144" font-size="12" text-anchor="middle" fill="#444">each notch is 10 times longer</text></svg>`;
  const hr = `<p class="hrkey">Mark an X for A, B and C.</p><svg viewBox="0 0 300 200" role="img" aria-label="An empty mini H-R diagram"><rect x="40" y="10" width="240" height="160" fill="#fff" stroke="#333"/><text x="40" y="188" font-size="11" fill="#444">Hotter</text><text x="280" y="188" font-size="11" text-anchor="end" fill="#444">Cooler</text><text x="14" y="90" font-size="11" fill="#444" transform="rotate(-90 14 90)" text-anchor="middle">Brighter</text></svg>`;
  // the stars are repeated beside the endings, so the matching lines stay in one picture
  const left = T.stars.map((s, i) => { const [teff, r] = tm[s.mass]; const y = 40 + i * 70; const rr = Math.min(r, 20); return starSVG(teff, rr, 60, y, false) + `<text x="${96}" y="${y + 5}" font-size="14" font-weight="700" fill="#111">${s.label} <tspan font-weight="500">${esc(s.note)}</tspan></text>`; }).join("");
  const burst = `<g transform="translate(430 0)"><circle cx="70" cy="45" r="30" fill="#ffb46b" opacity="0.3"/><circle cx="70" cy="45" r="16" fill="#fff6e8" stroke="#333"/>${[0, 1, 2, 3, 4, 5].map((k) => `<path d="M70 45 L${(70 + 40 * Math.cos(k * 1.05)).toFixed(1)} ${(45 + 34 * Math.sin(k * 1.05)).toFixed(1)}" stroke="#d58a3a" stroke-width="3"/>`).join("")}<circle cx="70" cy="45" r="34" fill="none" stroke="#c05a5a" stroke-dasharray="4 3"/></g>`;
  const wd = `<g transform="translate(450 90)"><circle cx="30" cy="30" r="12" fill="#f4f7ff" stroke="#333"/><circle cx="76" cy="30" r="12" fill="#3a78c8" stroke="#333"/><text x="76" y="58" font-size="11" text-anchor="middle" fill="#444">Earth</text></g>`;
  const city = `<g transform="translate(450 160)">${[0, 1, 2, 3, 4, 5, 6].map((k) => `<rect x="${k * 16}" y="${50 - (14 + (k * 37) % 30)}" width="12" height="${14 + (k * 37) % 30}" fill="#556"/>`).join("")}<circle cx="56" cy="8" r="8" fill="#eef4ff" stroke="#333"/></g>`;
  const ends = `<svg viewBox="0 0 640 220" role="img" aria-label="Stars A, B and C on the left, three endings in mixed order on the right">${left}${burst}${wd}${city}${[45, 120, 190].map((y) => `<circle cx="420" cy="${y}" r="4" fill="#333"/>`).join("")}${[40, 110, 180].map((y) => `<circle cx="210" cy="${y}" r="4" fill="#333"/>`).join("")}</svg>`;
  return `<div class="sl-sheet-in ticket"><header><h2>${esc(T.title)}</h2><div class="sheet-btns"><button type="button" class="sl-btn" data-act="print">Print</button><button type="button" class="sl-btn" data-act="hub">Close</button></div></header>
    <p class="nameline">Name ______________________</p>
    <section><h3>1</h3>${top}</section>
    <section><h3>2</h3><p>${esc(T.clock)}</p>${clock}<p>${esc(T.hr)}</p>${hr}</section>
    <section><h3>3</h3><p>${esc(T.ends)}</p>${ends}</section>
    <section><h3>4</h3><p class="bigline">${esc(T.line)} ______________________________</p><p class="bank">Word bank: ${T.bank.map((b) => `<span>${esc(b)}</span>`).join("")}</p></section>
    <section class="confusing"><h3>5</h3><p>${esc(T.last)}</p><div class="box"></div></section>
    <p class="note noprint">Pictures are a draft for Leo to finish.</p></div>`;
}
if (sheetEl) {
  const onCard = (e) => { const el = e.target.closest && e.target.closest("[data-card]"); if (!el || !flow) return; const id = el.dataset.card;
    if (id.startsWith("c-")) { const [, m, f] = id.split("-"); flow.setCard(m, f, el.value); } else { const [a, b] = id.split(":"); flow.setCard(a, b, el.value); }
    uiDirty = true; };
  sheetEl.addEventListener("input", onCard); sheetEl.addEventListener("change", onCard);
}
const ONION_CSS = Object.fromEntries(ONION);
let resizeT = 0; function resizeSoon() { clearTimeout(resizeT); resizeT = setTimeout(resize, 30); }
document.addEventListener("click", (e) => { const b = e.target.closest && e.target.closest("[data-act]"); if (!b || b.disabled || b.dataset.hold) return; act(b.dataset.act); });
document.addEventListener("pointerdown", (e) => { const b = e.target.closest && e.target.closest("[data-hold]"); if (b && flow) { flow.st.peek = true; const off = () => { flow.st.peek = false; removeEventListener("pointerup", off); removeEventListener("pointercancel", off); }; addEventListener("pointerup", off); addEventListener("pointercancel", off); } });
addEventListener("keydown", (e) => { if (!flow || (e.target && /^(INPUT|TEXTAREA|SELECT)$/.test(e.target.tagName))) return; if (e.key === "ArrowRight") act("next"); if (e.key === "ArrowLeft") act("prev"); if (e.key === " " && !(e.target && e.target.closest && e.target.closest("button"))) { e.preventDefault(); act("play"); } });

function act(id) {
  if (!flow) return; const st = flow.st; const [k, a, b] = id.split(":"); const rest = id.slice(id.indexOf(":") + 1);
  if (k === "readAloud") { const p = document.querySelector("#slCaption p"); if (p && window.speechSynthesis) { speechSynthesis.cancel(); speechSynthesis.speak(new SpeechSynthesisUtterance(p.textContent)); } return; }
  if (k === "mass") flow.pickMass(a);
  else if (k === "end") flow.answerHub(rest);
  else if (k === "pinUndo") flow.undoPin();
  else if (k === "start") { if (flow.start()) { if (st.skipped && st.stages[0].id !== "F4") { transient.skip = `Skipping about ${fmtYears(atEEP(tracks[st.mass], 202).age)} of formation.`; transient.skipUntil = clock + 4; } onStageChange(); } }
  else if (k === "choice") flow.commit(+a, id.split(":").slice(2).join(":"));
  else if (k === "meter") flow.commit(+a, st.massGuess[flow.stage().id] != null ? st.massGuess[flow.stage().id] : (flow.pending().a.min + flow.pending().a.max) / 2);
  else if (k === "play") { if (st.phase === "play") st.playing = !st.playing; }
  else if (k === "replay") { st.t = 0; st.phase = "play"; st.playing = true; }
  else if ((k === "next" || k === "prev" || k === "play" || k === "replay") && st.screen !== "stage") { /* stage controls only */ }
  else if (k === "next") { const r = flow.next(); if (r && r.skipped > 0) { transient.skip = `Skipped about ${fmtYears(r.skipped)}`; transient.skipUntil = clock + 4; } onStageChange(); }
  else if (k === "prev") { flow.prev(); onStageChange(); }
  else if (k === "hub") { flow.toHub(); onStageChange(); }
  else if (k === "skipForm") st.skipFormation = !st.skipFormation;
  else if (k === "compare") flow.openCompare();
  else if (k === "card") flow.openCard();
  else if (k === "ticket") flow.openTicket();
  else if (k === "print") { if (typeof window.print === "function") window.print(); }
  else if (k === "cmp") { const C = flow.cmp; if (a === "mass") C.toggle(b); else if (a === "begin") C.begin(); else if (a === "pick") { const parts = id.split(":"); C.pick(parts[2], parts.slice(3).join(":")); } else if (a === "play") C.c.playing = !C.c.playing; else if (a === "replay") { C.c.t = 0; C.c.step = "run"; C.c.playing = true; } else if (a === "reset") C.reset(); }
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
function cmpRunning() { return !!flow && flow.st.screen === "compare" && flow.cmp.c.step === "run" && flow.cmp.c.playing; }
// ---------------- COMPARE: two stage areas side by side, each with its own scale and clock (teaching spec 2.0, T13) ----------------
let scenesB = null, cmpScene = null;
function makeBar() { const grp = new THREE.Group(); const l = new THREE.Line(sbarLine.geometry, sbarLine.material); const t = new THREE.Line(sbarTick.geometry, sbarLine.material); l.renderOrder = t.renderOrder = 41; l.frustumCulled = t.frustumCulled = false; const body = new THREE.Group(); body.add(l, t); grp.add(body); const lab = scenes.label("", { size: 2.0, plate: false, color: "#E6E9F8" }); grp.add(lab); return { grp, body, lab }; }
function compareScene() {
  if (cmpScene) return cmpScene; if (!scenesB) scenesB = new Scenes(THREE, uni);
  const root = new THREE.Group(); root.position.y = 7; const sides = [-1, 1].map((sx) => { const g = new THREE.Group(); g.position.x = sx * 31; root.add(g); const bar = makeBar(); g.add(bar.grp); const name = scenes.label("", { size: 2.8 }); g.add(name); return { g, bar, name }; });
  const divider = new THREE.Line(new THREE.BufferGeometry().setFromPoints([new THREE.Vector3(0, -30, 0), new THREE.Vector3(0, 30, 0)]), new THREE.LineBasicMaterial({ color: 0x8E95B8, transparent: true, opacity: 0.35 })); root.add(divider);
  cmpScene = { root, kind: "compare", camDist: 122, radius: 26, kmPerUnit: () => null, strokes: 0, sides,
    update(c) {
      const C = flow.cmp; const pair = C.sorted(); let strokes = 0;
      pair.forEach((m, i) => { const sd = sides[i]; const sc = (i === 0 ? scenes : scenesB).star(); if (sc.root.parent !== sd.g) sd.g.add(sc.root);
        const s = C.starAt(m); const v = { row: s.row, stage: {}, type: "" }; sc.update({ ...c, v, st: { peek: false, answers: {} }, fitMax: 12 }); strokes += sc.strokes;
        const r = sc.radius; scenes.setLabel(sd.name, MASS_LABEL[m], `its own clock: ${fmtYears(s.age)}`); sd.name.quaternion.copy(c.camQuatLocal); sd.name.position.copy(new THREE.Vector3(0, r + 6, 0).applyQuaternion(c.camQuatLocal));
        const bar = scaleBar(sc.kmPerUnit(), Math.max(4, r * 0.8)); if (bar) { sd.bar.body.scale.set(bar.units, 0.9, 1); scenes.setLabel(sd.bar.lab, bar.label); sd.bar.lab.position.set(0, -1.6, 0); sd.bar.grp.quaternion.copy(c.camQuatLocal); sd.bar.grp.position.copy(new THREE.Vector3(0, -(Math.max(r, 6) * 1.25 + 4), 0).applyQuaternion(c.camQuatLocal)); } });
      cmpScene.strokes = strokes;
    } };
  return cmpScene;
}
function sceneFor(v) {
  if (flow && flow.st.screen === "compare") { const s = flow.cmp.c.step; return s === "run" || s === "done" ? compareScene() : null; }
  if (!flow || flow.st.screen !== "stage") return null;
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

function sceneRegion(sc) {
  const want = sc && sc.centered !== false && !layout.phone && layout.card && layout.panel && !document.body.classList.contains("sl-has-sheet");
  let off = layout.off0 || [0, 0], region = null;
  // phone: the free strip between the top bar and the bottom sheet (the sheet's height follows its content, so read it each frame)
  if (layout.phone) { const pe = $("slPanel"), te = $("slTop"); const pr = pe && !pe.hidden ? pe.getBoundingClientRect() : null; const top = te ? te.getBoundingClientRect().bottom : 0;
    if (pr && pr.height) { const bottom = Math.max(top + layout.h * 0.2, pr.top); layout.free = { top, bottom }; off = [0, layout.h / 2 - (top + bottom) / 2]; if (sc) region = { cx: layout.w / 2, cy: (top + bottom) / 2, maxR: Math.max(50, Math.min(layout.w / 2 - 10, (bottom - top) / 2 - 10)) }; } }
  if (want) { const x0 = layout.card.right + 16, x1 = layout.panel.left - 16; const cx = (x0 + x1) / 2, cy = layout.h * 0.47; region = { cx, cy, maxR: Math.max(80, Math.min((x1 - x0) / 2 - 8, layout.h * 0.40)) }; off = [layout.w / 2 - cx, layout.h / 2 - cy]; }
  if (!sc && !layout.phone && layout.card && layout.panel) off = [off[0], layout.h / 2 - (64 + layout.card.top) / 2];   // hub: the orbs sit above the H-R card
  const k = off.join(","); if (k !== layout.offKey) { layout.offKey = k; camera.setViewOffset(layout.w, layout.h, off[0], off[1], layout.w, layout.h); camera.updateProjectionMatrix(); }
  return region;
}
// ---------------- 3D labels: never smaller than 18 pt (24 px) on desktop, 18 px on phone, 56 px in the headset ----------------
const lp = new THREE.Vector3(), cp = new THREE.Vector3(), ps = new THREE.Vector3();
const LABEL_EM = 76 / 256;   // the main line's font size as a share of the label sprite's height
function sizeLabels(cam, xr) {
  let vpH = layout.h, minPx = layout.phone ? 18 : 24, tanH = Math.tan(camera.fov * Math.PI / 360);
  if (xr) { const sub = cam.cameras && cam.cameras[0]; if (sub) { vpH = sub.viewport ? sub.viewport.w : 1800; tanH = 1 / sub.projectionMatrix.elements[5]; } minPx = 56; }
  if (!xr) camera.updateMatrixWorld(); cam.getWorldPosition(cp); cam.getWorldQuaternion(lq);
  // on screen, a label plate is kept inside the free view: below the top bar, left of the side panel, clear of the H-R card
  const xMax = !xr && !layout.phone && layout.panel ? layout.panel.left - 10 : layout.w - 8, yMin = layout.phone && layout.free ? layout.free.top + 4 : 62, yMax = layout.phone && layout.free ? layout.free.bottom - 4 : layout.h - 8, card = !xr ? layout.card : null;
  scene.traverseVisible((o) => { const d = o.userData; if (!o.isSprite || !d.label || !d.base) return;
    o.getWorldPosition(lp); o.parent.getWorldScale(ps); const dist = Math.max(1e-6, lp.distanceTo(cp));
    const ppw = vpH / (2 * dist * tanH); const px = d.base[1] * ps.y * LABEL_EM * ppw; const mp = !xr && d.minPx != null ? d.minPx : minPx; const k = px > 0 ? Math.max(1, mp / px) : 1;
    d.k = k; o.scale.set(d.base[0] * k, d.base[1] * k, 1);
    if (xr || !d.clamp) return;
    sp2.copy(lp).project(camera); const sx = (sp2.x + 1) / 2 * layout.w, sy = (1 - sp2.y) / 2 * layout.h; if (sp2.z > 1) return;
    const W = o.scale.x * ps.x * ppw, H = o.scale.y * ps.y * ppw, cx = o.center.x;
    const L = sx + (d.x0 - cx) * W, Rr = sx + (d.x1 - cx) * W, hh = H * (d.ph || 0.6) / 2, top = sy - hh, bot = sy + hh;
    let dx = 0, dy = 0; if (Rr > xMax) dx = xMax - Rr; if (L + dx < 18) dx = 18 - L; if (top < yMin) dy = yMin - top; else if (bot > yMax) dy = yMax - bot;
    if (card && L + dx < card.right + 8 && bot + dy > card.top - 8) { const up = card.top - 8 - bot; const right = card.right + 8 - (L + dx); if (-up < right) dy = up; else dx += right; }
    if (!dx && !dy) return;
    const shift = new THREE.Vector3(dx / ppw, -dy / ppw, 0).applyQuaternion(lq); o.parent.getWorldQuaternion(wq2).invert(); shift.applyQuaternion(wq2).divide(ps);
    o.position.add(shift); if (d.line) { d.line.setXYZ(1, o.position.x, o.position.y, o.position.z); d.line.needsUpdate = true; } });
}
const sp2 = new THREE.Vector3(), lq = new THREE.Quaternion(), wq2 = new THREE.Quaternion();

// ---------------- frame loop ----------------
const tmp = new THREE.Vector3(), camLocal = new THREE.Vector3(), qW = new THREE.Quaternion(), qL = new THREE.Quaternion(), wq = new THREE.Quaternion();
let prev = 0, clock = 0, flowT = 0, boilT = 0, viewHalfH = 20;
const stats = { frames: 0, acc: 0, fps: 0, ms: 0, cpu: 0, cpuAcc: 0, samples: [] };
function frame(now) {
  const dt = (prev && !manual) ? Math.min(0.1, (now - prev) / 1000) : (manual ? manualDt : 0); prev = now; clock += dt;
  if (!calm) boilT += dt; flowT += dt * (calm ? 0.35 : 1);
  uni.uBoilT.value = boilT; uni.uFlowT.value = flowT; uni.uBreathT.value = flowT;
  if (!flow) { renderer.render(scene, camera); return; }
  const before = flow.st.phase; flow.tick(dt); if (flow.st.phase !== before) uiDirty = true;
  if (flow.st.screen === "compare") { const s0 = flow.cmp.c.step; flow.cmp.tick(dt); if (flow.cmp.c.step !== s0) { uiDirty = hrDirty = true; if (flow.cmp.c.step === "done") flow.compareDone(); } }
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
    // style B framing: scenes with a fit (radius in world units and its share of the frame height in Leo's 1080 px frames)
    // are sized to match, centred in the free area right of the H-R card so nothing sits under it (desktop)
    const region = sceneRegion(sc); let dist = (sc ? sc.camDist : 80) * view.zoom * fit;
    if (sc && sc.fit) { const f = sc.fit(); const tanH = Math.tan(camera.fov * Math.PI / 360); let frac = f.frac; if (region) frac = Math.min(frac, region.maxR * (layout.phone ? 0.62 : 1) / layout.h); /* phone: room for the callouts, as in Leo's 390 px frames */ if (layout.phone && !region) frac = Math.min(frac, 0.42 * layout.w / layout.h); dist = f.r / (2 * tanH * frac) * view.zoom; }
    viewHalfH = dist * Math.tan(camera.fov * Math.PI / 360) * (region ? Math.min(1, 2 * region.maxR / layout.h + 0.1) : 1);
    const cp = Math.cos(view.pitch);
    camera.position.set(Math.sin(view.yaw) * cp, Math.sin(view.pitch), Math.cos(view.yaw) * cp).multiplyScalar(dist); camera.lookAt(0, 0, 0);
  }
  const cam = presenting ? renderer.xr.getCamera() : camera;
  world.updateMatrixWorld(true); cam.getWorldPosition(tmp); camLocal.copy(tmp); world.worldToLocal(camLocal);
  cam.getWorldQuaternion(qW); world.getWorldQuaternion(wq); qL.copy(wq).invert().multiply(qW);
  uni.uCamLocal.value.copy(camLocal); uni.uCosElev.value = Math.max(0.25, Math.hypot(camLocal.x, camLocal.z) / (camLocal.length() || 1));
  bg.root.position.copy(camLocal);   // the sky stays at infinity
  const extra = {};
  if (sc) sc.update({ v, st: flow.st, help: flow.st.help, calm, now: performance.now(), time: clock, dt, camLocal, camQuatLocal: qL, extra, phone: layout.phone && !presenting, halfH: presenting ? (sc ? sc.camDist * 0.45 : 20) : viewHalfH });
  else for (const [m, o] of Object.entries(hubOrbs)) { o.grp.scale.setScalar(flow.st.mass === m ? 1.18 : 1); o.l.quaternion.copy(qL); o.l.position.y = layout.phone && !presenting && o.i % 2 ? o.R + 3 : -o.R - 3;  const ph = layout.phone && !presenting; hubTitle.position.y = ph ? 15 : 12; hubNote.position.y = ph ? -15 : -12; }   /* phone: every other key label sits above its orb so the five never overlap */
  hubTitle.quaternion.copy(qL); scenes.setLabel(hubTitle, flow.st.screen === "compare" ? (flow.cmp.c.step === "setup" ? "Pick two masses" : "") : flow.st.hubStep === "pins" ? "Place your pins" : "Pick a starting mass");
  // scale bar and zoom labels (labelled zoom changes, never a fake scale)
  const km = sc && sc.kmPerUnit ? sc.kmPerUnit() : null;
  // lastKm is the scale of the last label (or of the scene's start), so slow drifts add up and small steps never label
  if (km && lastKm) { const t = zoomText(lastKm, km); if (t) { transient.zoom = t; transient.zoomUntil = clock + 4; uiDirty = true; lastKm = km; } }
  if (km && !lastKm) lastKm = km;
  const bar = km ? scaleBar(km, (sc.radius || 10) * 0.8) : null; sbar.visible = !!bar && !(sc && (sc.kind === "twopaths"));
  if (bar) { sbarBody.scale.set(bar.units, Math.max(0.6, (sc.radius || 10) * 0.05), 1); scenes.setLabel(sbarLab, bar.label); sbar.quaternion.copy(qL); sbar.position.copy((sc.barAt ? new THREE.Vector3(...sc.barAt, 0) : new THREE.Vector3(0, -((sc.radius || 10) * 1.3 + 4), 0)).applyQuaternion(qL)); sbarLab.position.set(0, -1.6, 0); }
  if (transient.zoom && clock > transient.zoomUntil) { transient.zoom = null; uiDirty = true; }
  sizeLabels(cam, presenting);
  if (transient.skip && clock > transient.skipUntil) { transient.skip = null; uiDirty = true; }
  // UI
  if (flow.st.phase === "play" || uiDirty || cmpRunning()) {
    const M = uiModel(flow, { view: v || undefined, calm, zoom: transient.zoom, skip: transient.skip, sceneChips: sc && sc.chips, stageSpan: v ? stageSpan() : null });
    if (M.masses) M.masses.forEach((m) => { const c = scenes.T && temperatureCss(m.teff); m.css = c; });
    if (!presenting) renderUI(M); else panel.draw(M, hrModel(v || {}), performance.now(), uiDirty);
    uiDirty = false; window.__stellarUI = M;
  }
  if (!presenting && hrG && (hrDirty || flow.st.phase === "play" || cmpRunning())) { const dpr = sizeHR(); const m = hrModel(v || {}); const k = JSON.stringify([m.dot, m.dots, m.zones && 1, m.trail && m.trail.map((t) => t.pts.length), m.pins, m.view, m.help, hrCanvas.width, hrCanvas.height, m.ghosts.length, m.noDot, m.fork]); if (k !== hrKey || hrDirty) { drawHR(hrG, hrCanvas.width, hrCanvas.height, m, dpr * (layout.phone ? 0.82 : 1)); hrKey = k; } hrDirty = false; }
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
    tracks = prepareTracks(tj); flow = createFlow(sj, tracks, { help: 0, lockHelp: q.get("lock") === "1", tier: tierQ });
    if (helpQ) flow.setHelp(helpQ, true); else if (tierQ === 1) flow.setHelp(1, true); syncHelp();
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
  /** COMPARE straight to fraction t for a pair, answering the three picks with the first choice. */
  compare(pair, t = 1) {
    flow.toHub(); if (!flow.st.runs.length) flow.st.runs.push("1"); flow.openCompare(); const C = flow.cmp; for (const m of pair) C.toggle(m); C.begin();
    let q; let guard = 0; while ((q = C.pending()) && guard++ < 5) C.pick(q.id, q.choices[0]); C.c.t = t; C.c.step = t >= 1 ? "done" : "run"; C.c.playing = false; if (t >= 1) flow.compareDone(); uiDirty = hrDirty = true; lastKm = null;
  },
  openCard() { if (!flow.st.runs.length) flow.st.runs.push("1"); flow.openCard(); uiDirty = true; }, openTicket() { flow.openTicket(); uiDirty = true; },
  renderAt(tSec, dt = 1 / 60) { manualDt = dt; flowT = tSec; boilT = calm ? boilT : tSec; frame(tSec * 1000); },
  info: () => ({ calls: renderer.info.render.calls, triangles: renderer.info.render.triangles, scene: cur ? cur.kind : "hub", strokes: (cur ? cur.strokes : 0) + bg.strokes, sceneStrokes: cur ? cur.strokes : 0, skyStrokes: bg.strokes }),
  frameStats: () => ({ ...stats, samples: stats.samples.length }),
  canvas, renderer, camera, world, get panel() { return panel; },
  /** CSS px of the current star body's centre, plus the Teff the scene is drawing (for the hue check). */
  centerOf() {
    sceneRegion(cur); camera.updateMatrixWorld();   // a resize (screenshots fire one) resets the view offset until the next frame
    const b = cur && cur.body ? cur.body : cur ? cur.root : hub; const p = b.getWorldPosition(new THREE.Vector3()).project(camera); const r = canvas.getBoundingClientRect();
    const v = flow && flow.st.screen === "stage" ? flow.view() : null; const row = v ? (v.cooling || v.row) : null;
    return { x: r.left + (p.x + 1) / 2 * r.width, y: r.top + (1 - p.y) / 2 * r.height, teff: row ? Math.pow(10, row.logT) : null, radiusPx: cur && cur.radius ? cur.radius : null, scene: cur ? cur.kind : "hub" };
  },
};
