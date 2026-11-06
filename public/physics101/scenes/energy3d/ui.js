// Shared DOM pieces for energy3d scenes: panel, predict (locks the test), explain reveal, jars, packets.
export const el = (t, c, x) => { const e = document.createElement(t); if (c) e.className = c; if (x != null) e.textContent = x; return e; };
export const fill = (s, o) => String(s ?? "").replace(/\{(\w+)\}/g, (_, k) => o[k] ?? "");

// Controls go in the page's Test it box (host.e3dPanel, set by the wrapper) so they never cover the 3D stage.
// Without one they float over the stage. Text is at least 16px.
export function panel(host, dark, takeaway, question) {
  const answer = takeaway; takeaway = question || host.e3dQuestion || "Make a prediction first, then test it."; // round 1: never show the conclusion in state 0
  const narrow = (host.clientWidth || innerWidth) < 600;
  if (takeaway && !narrow) { // one-sentence takeaway, written on the scene so a screenshot alone says what it shows
    const t = el("div", "e3d-take", takeaway);
    t.style.cssText = "position:absolute;left:12px;right:12px;top:10px;z-index:1;pointer-events:none;font:600 clamp(14px,2.2vw,18px)/1.25 'Patrick Hand','Gochi Hand',cursive;color:" + (dark ? "#EDE6D6" : "#2B2622");
    host.appendChild(t);
  }
  const ui = el("div", "e3d-ui");
  let predicted = false;
  const reveal = () => { host.querySelectorAll("[data-after]").forEach((n) => { n.hidden = false; }); host.e3dPanel?.querySelectorAll("[data-after]").forEach((n) => { n.hidden = false; }); host.querySelectorAll(".e3d-take").forEach((t) => { t.textContent = answer; }); ui.querySelectorAll(".e3d-take").forEach((t) => { t.textContent = answer; }); };
  ui.addEventListener("change", (e) => { if (e.target.type === "radio") predicted = true; });
  ui.addEventListener("click", (e) => { const b = e.target.closest("button"); if (predicted && b && !b.hasAttribute("aria-pressed") && b.getAttribute("role") !== "tab" && !b.dataset.noReveal) setTimeout(reveal, 0); });
  ui.style.cssText = "font-size:16px;line-height:1.4;display:flex;flex-direction:column;gap:6px;align-items:flex-start";
  if (takeaway && narrow) { const t = el("strong", "e3d-take", takeaway); ui.appendChild(t); } // phones: takeaway leads the panel, the scene is too small
  if (host.e3dPanel) {
    host.e3dPanel.appendChild(ui);
    // phones: bring the panel's "Test it:" heading into view, with a top inset
    const h = host.e3dPanel.closest(".test-it")?.querySelector("h2");
    if (h && typeof innerWidth === "number" && innerWidth < 600) { h.style.scrollMarginTop = "16px"; setTimeout(() => h.scrollIntoView({ block: "start", behavior: "auto" }), 60); }
    return ui;
  }
  if (getComputedStyle(host).position === "static") host.style.position = "relative";
  ui.style.cssText += ";position:absolute;left:12px;top:12px;max-width:330px;max-height:calc(100% - 24px);overflow:auto;padding:10px;border-radius:10px;background:" + (dark ? "rgba(31,29,26,.88)" : "rgba(251,246,234,.92)") + ";color:" + (dark ? "#EDE6D6" : "#2B2622");
  host.appendChild(ui); return ui;
}

// Predict radios; returns { box, picked(), onPick(fn) }. name must be unique per scene.
export function predict(ui, name, legend, choices) {
  const q = el("fieldset"); q.style.cssText = "border:1px solid currentColor;border-radius:8px;padding:4px 8px;margin:0;font:inherit"; q.append(el("legend", null, legend));
  // Leo general: prediction targets are 44 x 44 CSS px minimum, a ring that fills when committed; the radio stays for keyboards
  q.classList.add("e3d-predict");
  (choices || []).forEach((c, i) => { const l = el("label", "e3d-target"); const r = el("input"); r.type = "radio"; r.name = name; r.value = i; const ring = el("span", "e3d-ring"); l.append(r, ring, el("span", null, c)); q.append(l); });
  ui.appendChild(q);
  return { box: q, picked: () => { const v = q.querySelector("input:checked"); return v ? +v.value : null; }, onPick: (fn) => q.addEventListener("change", fn) };
}

// after(node): hidden until the student predicts and tests (panel reveal)
export function after(n) { n.dataset.after = "1"; n.hidden = true; return n; }

export function explain(ui, label, body) {
  const b = el("button", null, label); b.hidden = true; const p = el("p", null, body); p.hidden = true;
  const extra = [];
  b.addEventListener("click", () => { p.hidden = false; extra.forEach((e) => { e.hidden = false; }); }); ui.append(b, p);
  // also(node): node stays hidden until Explain is pressed
  return { show: () => { b.hidden = false; }, also: (n) => { n.hidden = true; extra.push(n); return n; } };
}

// Setup inspector: screen-space card of givens and formulas (top-left on desktop, top of the Test it panel on phones).
// lines: strings; after: strings hidden until the student has predicted and tested (panel reveal).
export function inspector(host, lines, after = [], title = "Setup") {
  const dark = document.documentElement.dataset.theme === "dark", ink = dark ? "#EDE6D6" : "#2B2622";
  const small = (host.clientWidth || innerWidth) < 600;
  const box = el("div", "e3d-hud e3d-inspector");
  box.style.cssText = `position:absolute;left:12px;top:48px;max-width:min(250px,26%);z-index:2;box-sizing:border-box;padding:6px 9px;color:${ink};background:${dark ? "rgba(31,29,26,.94)" : "rgba(251,246,234,.95)"};border:1.5px solid ${ink};border-radius:10px;box-shadow:1px 2px 0 rgba(43,38,34,.18);font:16px/1.25 'Patrick Hand','Gochi Hand',cursive;font-variant-numeric:tabular-nums;pointer-events:none`;
  box.append(el("div", null, title)); box.firstChild.style.fontWeight = "700";
  for (const t of lines) box.append(el("div", null, t));
  for (const t of after) { const d = el("div", null, t); d.dataset.after = "1"; d.hidden = true; d.style.fontWeight = "700"; box.append(d); }
  if (small && host.e3dPanel) { box.style.cssText += ";position:relative;left:auto;top:auto;max-width:none;width:100%;margin:8px 0;font-size:16px;clear:both"; host.e3dPanel.append(box); }
  else host.appendChild(box);
  return box;
}

// Energy meters live in a screen-space HUD (round 1: no chart cylinders on the floor). Right column on desktop,
// collapsible bottom sheet on phones. jar() keeps its old signature so every scene moves at once; the account name and
// icon come from the colour (palette key), or from glass.userData.label when a scene sets one.
import { palette as PAL } from "./palette.js";
export const ICON = { kinetic: "\u27A4", gravitational: "\u2B06", elastic: "\u2307", thermal: "\u2668", chemical: "\u2697", sound: "\u266A", light: "\u2600", electrical: "\u26A1", magnetic: "\u29BF", electrostatic: "\u00B1", nuclear: "\u269B" };
const kindOf = (color) => Object.keys(PAL).find((k) => [PAL[k].light, PAL[k].dark].some((c) => c.toLowerCase() === String(color).toLowerCase())) || "";
function meterHud(host) {
  if (host.e3dMeters) return host.e3dMeters;
  const dark = document.documentElement.dataset.theme === "dark", ink = dark ? "#EDE6D6" : "#2B2622";
  const small = (host.clientWidth || innerWidth) < 600;
  const box = el("div", "e3d-meters"); box.setAttribute("role", "group"); box.setAttribute("aria-label", "Energy accounts");
  box.style.cssText = `position:absolute;z-index:2;box-sizing:border-box;color:${ink};background:${dark ? "rgba(31,29,26,.94)" : "rgba(251,246,234,.95)"};border:1.5px solid ${ink};border-radius:10px;box-shadow:1px 2px 0 rgba(43,38,34,.18);font:16px/1.15 'Patrick Hand','Gochi Hand',cursive;font-variant-numeric:tabular-nums;padding:4px 8px;` +
    (small ? "left:6px;right:96px;bottom:6px;max-height:48%;overflow:auto;" : host.e3dMetersGrid ? "left:12px;right:130px;bottom:10px;" : "right:12px;top:56px;width:190px;");
  const head = el("button", "e3d-meters-head"); head.type = "button"; head.setAttribute("aria-expanded", "true");
  head.style.cssText = `all:unset;display:flex;align-items:center;justify-content:space-between;width:100%;min-height:${small ? 44 : 26}px;cursor:pointer;font:700 16px/1 'Patrick Hand','Gochi Hand',cursive`;
  head.append(el("span", null, "Energy accounts"), el("span", "chev", small ? "\u25BE" : ""));
  const rows = el("div"); rows.style.cssText = host.e3dMetersGrid ? `display:grid;grid-template-columns:repeat(${small ? 2 : host.e3dMetersGrid},minmax(64px,1fr));gap:${small ? "2px 8px" : "8px"};margin-top:2px` : "display:flex;flex-direction:column;gap:4px;margin-top:4px";
  const scale = el("div", "e3d-meter-scale"); scale.style.cssText = "display:flex;justify-content:space-between;margin:2px 0 0 26px;font-size:16px;border-top:1.5px solid currentColor;padding-top:1px";
  const s0 = el("span", null, "0 J"), s1 = el("span", null, ""); scale.append(s0, s1);
  const note = el("div", null, ""); note.style.cssText = "font-size:16px;margin-top:2px;opacity:.85";
  box.append(head, rows, scale, note);
  head.addEventListener("click", () => { if (!small) return; const open = rows.hidden; rows.hidden = scale.hidden = note.hidden = !open; head.setAttribute("aria-expanded", String(open)); head.lastChild.textContent = open ? "\u25BE" : "\u25B8"; });
  host.appendChild(box); // phones too (round 2): the ledger and joule scale stay in the stage, collapsible
  host.e3dMeters = { box, rows, ink, dark, setScale(max, unit = "J", pending) { s1.textContent = max == null ? "" : `${max} ${unit}`; s0.textContent = max == null ? "" : `0 ${unit}`; note.textContent = pending ? "values pending approval" : ""; } };
  host.e3dMeters.setScale(null);
  return host.e3dMeters;
}
// Scenes call this once: the full-bar value in joules (or kJ), or pending=true for held values.
export function meterScale(scene, max, unit = "J", pending = false) { const h = scene.userData.host; if (h) meterHud(h).setScale(max, unit, pending); }
export function jar(THREE, scene, toon, x, z, color) {
  const host = scene.userData.host, H = meterHud(host), kind = kindOf(color);
  const row = el("div"); row.style.cssText = "display:grid;grid-template-columns:20px 1fr;gap:6px;align-items:center";
  const ic = el("span", null, ICON[kind] || "\u25CF"); ic.setAttribute("aria-hidden", "true");
  ic.style.cssText = `width:20px;height:20px;border-radius:50%;display:grid;place-items:center;font-size:13px;color:#fff;background:${color};border:1.5px solid ${H.ink}`;
  const right = el("div"); const name = el("div", null, kind); name.style.cssText = "font-size:16px;white-space:nowrap";
  const track = el("div"); track.style.cssText = `position:relative;height:10px;border:1.5px solid ${H.ink};border-radius:5px;overflow:hidden;background:repeating-linear-gradient(90deg,transparent 0 calc(25% - 1px),${H.dark ? "#EDE6D655" : "#2B262233"} calc(25% - 1px) 25%)`;
  const bar = el("div"); bar.style.cssText = `position:absolute;left:0;top:0;bottom:0;width:0;background:${color}`;
  track.appendChild(bar); right.append(name, track);
  if ((host.clientWidth || innerWidth) < 600) { right.style.cssText = "display:flex;align-items:center;gap:4px;min-width:0"; track.style.flex = "1 1 24px"; track.style.minWidth = "24px"; ic.style.width = ic.style.height = "16px"; row.style.gridTemplateColumns = "16px 1fr"; row.style.gap = "4px"; } /* phones: one line per account */ row.append(ic, right); H.rows.appendChild(row);
  // glass stands in for the old tube: setting its label renames the account (it is not added to the scene)
  const glass = new THREE.Object3D(); let label = "";
  Object.defineProperty(glass.userData, "label", { get: () => label, set: (v) => { label = v; name.textContent = v || kind; }, configurable: true });
  const set = (v) => { const f = Math.max(0, Math.min(1, +v || 0)); bar.style.width = (f * 100).toFixed(1) + "%"; row.dataset.f = f.toFixed(3); };
  set(0);
  const mesh = { material: { color: new THREE.Color(color) }, visible: true, position: new THREE.Vector3(x, 0, z), scale: new THREE.Vector3(1, 1, 1) };
  return { set, top: () => new THREE.Vector3(x, 1.2, z), mesh, glass, row };
}

// Glowing packets that fly from a to b with an arc.
export function packets(THREE, scene, o = {}) {
  const c = document.createElement("canvas"); c.width = c.height = 64; const x = c.getContext("2d");
  const g = x.createRadialGradient(32, 32, 0, 32, 32, 32); g.addColorStop(0, "#fff"); g.addColorStop(1, "rgba(255,255,255,0)"); x.fillStyle = g; x.fillRect(0, 0, 64, 64);
  const tex = new THREE.CanvasTexture(c), list = [];
  return {
    send(a, b, color, speed = 1.5, arc = 0.5) { const s = new THREE.Sprite(new THREE.SpriteMaterial({ map: tex, color, transparent: true, depthWrite: false, blending: o.normal ? THREE.NormalBlending : THREE.AdditiveBlending })); s.scale.setScalar(o.size || 0.25); s.position.copy(a); scene.add(s); list.push({ s, a: a.clone(), b: b.clone(), k: 0, speed, arc }); },
    step(dt) { for (let i = list.length - 1; i >= 0; i--) { const p = list[i]; p.k = Math.min(1, p.k + dt * p.speed); p.s.position.lerpVectors(p.a, p.b, p.k); p.s.position.y += Math.sin(Math.PI * p.k) * p.arc; if (p.k >= 1) { scene.remove(p.s); p.s.material.dispose(); list.splice(i, 1); } } },
  };
}

// Jasper hook (spec: silent, no handle, casts a shadow, holds a short card). Leo's PNG cutouts are not in the repo yet:
// when public/physics101/img/energy3d-jasper/<name>.png exists it is shown bottom-left with text.jasperCard; otherwise nothing.
const JASPER_ON = true;
const JASPER = {
  stores: ["bottom-right", 0.28, "STORE OR TRANSFER?", 0.056, 0.367, 0.362, 0.541, 0.734],
  track: ["bottom-left", 0.26, "", 0.347, 0.207, 0.629, 0.371, 0.742],
  spring: ["bottom-right", 0.28, "SIDEWAYS SPEED?", 0.627, 0.256, 0.98, 0.471, 0.77],
  bounce: ["bottom-right", 0.3, "", 0.047, 0.371, 0.338, 0.555, 0.797],
  kettle: ["bottom-left", 0.28, "ENERGY OR RATE?", 0.063, 0.066, 0.296, 0.242, 0.746],
  lamps: ["bottom-right", 0.3, "", 0.049, 0.574, 0.343, 0.77, 0.723],
  grid: ["bottom-left", 0.26, "THIS MODEL, THESE INPUTS", 0.056, 0.367, 0.363, 0.543, 0.732],
  food: ["bottom-right", 0.28, "MODEL BODY, MODEL STAIRS", 0.732, 0.217, 0.979, 0.342, 0.729],
  insulation: ["bottom-left", 0.28, "ENERGY OR RATE?", -0.62, 0.36, 0.24, 0.54, 0.592], // art has no card: drawn left of his pointing hand
  journey: ["top-right", 0.24, "", 0.726, 0.244, 0.975, 0.418, 0.863],
};
// Silent HUD Jasper: no handle, no pointer events. [corner, scale, card text, card box x0,y0,x1,y1 as image fractions (x0 < 0: card sits outside the art), aspect]
export function jasper(host, name, card) {
  // Leo drew Jasper for these scenes; the sheets' "No Jasper" only means the prop sheets leave him out.
  const J = JASPER[name]; if (!JASPER_ON || typeof Image === "undefined" || !J) return null;
  const [corner, scale, def, x0, y0, x1, y1, ar] = J; const text = card || def;
  const small = (host.clientWidth || innerWidth) < 600;
  const w = el("div", "e3d-jasper"); w.setAttribute("aria-hidden", "true");
  const [v, h] = corner.split("-");
  w.style.cssText = `position:absolute;${v}:${h === "right" ? 64 : 16}px;${h}:16px;height:${small ? "max(" + scale * 100 + "%, 64px)" : scale * 100 + "%"};aspect-ratio:${ar};pointer-events:none;z-index:1${x0 < 0 ? `;transform:translateX(${-x0 * 100 + 4}%)` : ""}`; // screen-space HUD: no world shadow
  if (!small) w.style.cssText += `;background:${document.documentElement.dataset.theme === "dark" ? "rgba(31,29,26,.82)" : "rgba(251,246,234,.86)"};border-radius:12px;box-shadow:0 0 0 6px ${document.documentElement.dataset.theme === "dark" ? "rgba(31,29,26,.82)" : "rgba(251,246,234,.86)"},0 0 0 7.5px #2B2622`;
  const img = new Image(); img.alt = ""; img.style.cssText = "width:100%;height:100%;display:block";
  w.appendChild(img);
  if (text) {
    const c = el("div", "e3d-jasper-card", text);
    if (x0 < 0) c.dataset.outside = "1";
    c.style.cssText = `position:absolute;left:${x0 * 100 + 2}%;top:${y0 * 100 + 2}%;width:${(x1 - x0) * 100 - 4}%;height:${(y1 - y0) * 100 - 4}%;display:flex;align-items:center;justify-content:center;text-align:center;color:#2B2622;font:700 11px/1.05 'Patrick Hand','Gochi Hand',cursive;overflow:hidden;overflow-wrap:anywhere`;
    if (x0 < 0) c.style.cssText += ";background:#FFFDF5;border:1.5px solid #2B2622;border-radius:7px;box-shadow:1px 2px 0 rgba(43,38,34,.18);padding:2px 4px;box-sizing:border-box";
    w.appendChild(c);
    const fitText = () => { const ch = c.clientHeight; if (!ch) return; let f = Math.max(ch * 0.34, 16); c.style.fontSize = f + "px"; while (f > 16 && (c.scrollHeight > ch || c.scrollWidth > c.clientWidth)) { f -= 0.5; c.style.fontSize = f + "px"; }
      // still too long at the 14 px floor (12 on phones): the card grows past the drawn card, on a cream backing
      if (c.scrollHeight > ch + 1 || c.scrollWidth > c.clientWidth + 1) { c.style.height = "auto"; c.style.width = "max-content"; if (small || h === "right") { c.style.left = "auto"; c.style.right = "0"; c.style.maxWidth = small ? "150px" : "190px"; } /* grow inward, never off the stage */ if (!(small || h === "right")) c.style.maxWidth = "190px"; c.style.padding = "3px 6px"; c.style.background = "#FFFDF5"; c.style.border = "1.5px solid #2B2622"; c.style.borderRadius = "7px"; }
    };
    if (typeof ResizeObserver !== "undefined") new ResizeObserver(fitText).observe(w);
    img.addEventListener("load", fitText);
  }
  // phones: Jasper sits at the top of the Test it panel, not over the props
  if (small) w.style.cssText = "position:absolute;right:4px;bottom:6px;height:110px;aspect-ratio:" + ar + ";pointer-events:none;z-index:3;filter:drop-shadow(2px 3px 2px rgba(20,18,16,.3))"; // round 2: Jasper stays in the phone stage
  img.onload = () => { host.appendChild(w); };
  img.src = new URL(`../../img/energy3d-jasper/jasper-${name}${small ? "-512" : ""}.webp`, import.meta.url).href;
  return w;
}

// Screen labels pinned to 3D points (at least 13 px). items: [{ text, at: Vector3 }]. Call update() each frame.
export function labels3d(host, S, items, ink) {
  const _q = new S.THREE.Vector3();
  const list = items.map(({ text, at }) => { const d = el("div", "e3d-label", text); d.style.cssText = "position:absolute;transform:translate(-50%,0);font-size:16px;line-height:1.1;pointer-events:none;white-space:nowrap;color:" + ink; host.appendChild(d); return { d, at }; });
  S.onFrame(() => { for (const l of list) { _q.copy(l.at).project(S.camera); l.d.style.left = ((_q.x + 1) / 2 * host.clientWidth) + "px"; l.d.style.top = ((1 - _q.y) / 2 * host.clientHeight + 4) + "px"; } });
  return { remove: () => list.forEach((l) => l.d.remove()) };
}

// Energy ribbon (round 1, shared item 4): a flat band along a path; width = amount (accumulated or per-second share),
// never particle count. Unshadowed, unlit, ignored by the camera fit. Branches are more ribbons starting on this one.
export function ribbon(THREE, scene, pts, color, { width = 0.12, up = [0, 1, 0], label, labelPos = "above" } = {}) {
  const curve = new THREE.CatmullRomCurve3(pts.map((p) => (p.isVector3 ? p : new THREE.Vector3(...p))));
  const mat = new THREE.MeshBasicMaterial({ color, transparent: true, opacity: 0.85, side: THREE.DoubleSide, depthWrite: false });
  const mesh = new THREE.Mesh(new THREE.BufferGeometry(), mat); mesh.castShadow = mesh.receiveShadow = false; mesh.userData.noFit = true; mesh.renderOrder = 2;
  const U = new THREE.Vector3(...up), N = 48;
  let w = -1, k = 1; // k: drawn share of the path, 0..1 (grows during a transfer)
  const build = () => {
    const pos = [], idx = [], n = Math.max(2, Math.round(N * k));
    for (let i = 0; i <= n; i++) {
      const t = (i / n) * k, p = curve.getPointAt(t), tan = curve.getTangentAt(t), side = new THREE.Vector3().crossVectors(tan, U);
      if (side.lengthSq() < 1e-6) side.set(1, 0, 0); side.normalize().multiplyScalar(w / 2);
      pos.push(p.x - side.x, p.y - side.y, p.z - side.z, p.x + side.x, p.y + side.y, p.z + side.z);
      if (i) { const a = 2 * i - 2; idx.push(a, a + 1, a + 2, a + 1, a + 3, a + 2); }
    }
    mesh.geometry.dispose(); mesh.geometry = new THREE.BufferGeometry(); mesh.geometry.setAttribute("position", new THREE.Float32BufferAttribute(pos, 3)); mesh.geometry.setIndex(idx);
  };
  const api = {
    mesh, curve,
    set(width2, share = k) { width2 = Math.max(0, width2); if (Math.abs(width2 - w) < 1e-4 && Math.abs(share - k) < 1e-3) return api; w = width2; k = Math.max(0.001, Math.min(1, share)); mesh.visible = w > 0.002; build(); return api; },
    at: (t) => curve.getPointAt(t),
    glow(rate) { mat.opacity = 0.45 + 0.5 * Math.max(0, Math.min(1, rate)); return api; }, // brightness = rate
  };
  if (label) { mesh.userData.label = label; mesh.userData.labelPos = labelPos; mesh.userData.labelAnchor = curve.getPointAt(0.5); }
  scene.add(mesh); api.set(width, 1); return api;
}
