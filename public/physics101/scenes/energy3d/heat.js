// Every Joule Sim 5. mountKettle: Page 12 ledger (Tesla C6). mountInsulation: jacketed calorimeter vs bare (Tesla O2: no numbers).
import { createEnergyScene, toon, palette, isDark } from "./core.js";
import { C_WATER, KETTLE, kettleTime, band5, heatQ, relativeLossShape } from "./physics.js";

import { panel } from "./ui.js";
const el = (t, c, x) => { const e = document.createElement(t); if (c) e.className = c; if (x != null) e.textContent = x; return e; };
const fill = (s, o) => s.replace(/\{(\w+)\}/g, (_, k) => o[k] ?? "");

export function mountKettle(host, text = {}, opts = {}) {
  const T = (k, d = "") => text[k] ?? d;
  const S = createEnergyScene(host, { camera: [0, 3, 6], target: [0, 1, 0], ...opts });
  if (!S) return null;
  const { THREE, scene, onFrame } = S;
  const dark = isDark(), M = dark ? "dark" : "light";
  const kettles = [KETTLE.m, KETTLE.m / 2].map((m, i) => {
    const body = toon(new THREE.Mesh(new THREE.CylinderGeometry(0.6, 0.7, 1.4, 28)), dark ? "#9AA3AD" : "#C8CED6");
    body.position.set(i ? 1.4 : -1.4, 0.7, 0); scene.add(body);
    const water = new THREE.Mesh(new THREE.CylinderGeometry(0.55, 0.55, 1, 24), new THREE.MeshToonMaterial({ color: palette.kinetic[M], transparent: true, opacity: 0.55 }));
    const h = i ? 0.5 : 1.0; water.scale.y = h; water.position.set(body.position.x, 0.08 + h / 2, 0); scene.add(water);
    const therm = new THREE.Mesh(new THREE.BoxGeometry(0.08, 1, 0.08), new THREE.MeshBasicMaterial({ color: palette.thermal[M] }));
    therm.position.set(body.position.x + 0.9, 0.5, 0); therm.scale.y = 0.2; scene.add(therm);
    return { m, water, therm, t: kettleTime(m) };
  });
  const ui = panel(host, dark);
  ui.append(el("div", null, T("formula")), el("div", null, fill(T("defaults"), { m: KETTLE.m, P: KETTLE.P, C: C_WATER })));
  const lab = el("label", null, T("predictLabel")); const inp = el("input"); inp.type = "number"; inp.step = "0.1"; inp.setAttribute("aria-label", T("predictLabel"));
  ui.append(lab, inp);
  const go = el("button", null, T("switch", "Switch on")); go.disabled = true; ui.appendChild(go);
  const out = el("p"); ui.appendChild(out);
  const exB = el("button", null, T("explainBtn", "Explain")); exB.hidden = true; const ex = el("p", null, T("explain")); ex.hidden = true; ui.append(exB, ex);
  inp.addEventListener("input", () => { go.disabled = !(+inp.value > 0); });
  exB.addEventListener("click", () => { ex.hidden = false; });
  let t = -1;
  go.addEventListener("click", () => {
    t = 0; go.disabled = true;
    const [lo, hi] = band5(kettles[0].t), p = +inp.value;
    out.textContent = fill(T(p >= lo && p <= hi ? "right" : "wrong"), { Q: Math.round(heatQ(KETTLE.m, C_WATER, 80)), t: kettles[0].t.toFixed(1), half: kettles[1].t.toFixed(1), lo: lo.toFixed(2), hi: hi.toFixed(2) });
    exB.hidden = false;
  });
  onFrame((dt) => {
    if (t < 0) return;
    t += dt * (S.reduce ? 4 : 2); // 2x model time so the run fits on screen
    for (const k of kettles) { const f = Math.min(1, t / k.t); k.therm.scale.y = 0.2 + 0.8 * f; k.therm.position.y = k.therm.scale.y / 2; }
    if (t > kettles[0].t) { t = -1; go.disabled = false; }
  });
  return { ...S, dispose() { ui.remove(); S.dispose(); } };
}

export function mountInsulation(host, text = {}, opts = {}) {
  const T = (k, d = "") => text[k] ?? d;
  const S = createEnergyScene(host, { camera: [0, 4, 8], target: [0, 1, 0], ...opts });
  if (!S) return null;
  const { THREE, scene, addDrag, onFrame } = S;
  const dark = isDark(), M = dark ? "dark" : "light", hot = palette.thermal[M];
  const make = (x, jacket) => {
    const cup = toon(new THREE.Mesh(new THREE.CylinderGeometry(0.8, 0.8, 1.4, 28)), dark ? "#9AA3AD" : "#C8CED6");
    cup.position.set(x, 0.7, 0); scene.add(cup);
    const heater = toon(new THREE.Mesh(new THREE.BoxGeometry(0.3, 0.3, 0.3)), hot); heater.position.set(x, 1.6, 0); scene.add(heater);
    let wrap = null;
    if (jacket) { wrap = new THREE.Mesh(new THREE.CylinderGeometry(0.85, 0.85, 1.45, 28, 1, true), new THREE.MeshToonMaterial({ color: dark ? "#B79A6A" : "#E3C793", transparent: true, opacity: 0.85, side: THREE.DoubleSide })); wrap.position.copy(cup.position); scene.add(wrap); }
    const arrows = [0, 1, 2, 3].map((i) => { const a = Math.PI / 2 * i, d = new THREE.Vector3(Math.cos(a), i === 3 ? 0.6 : 0.1, Math.sin(a)).normalize(); const h = new THREE.ArrowHelper(d, new THREE.Vector3(x, 0.8, 0).addScaledVector(d, 0.9), 1, hot, 0.25, 0.15); scene.add(h); return h; });
    return { x, wrap, arrows };
  };
  const bare = make(-2, false), ins = make(2, true);
  // drag handle: a tab on the jacket's side, dragged along x sets thickness 0..1
  const tab = toon(new THREE.Mesh(new THREE.BoxGeometry(0.3, 0.5, 0.3)), palette.elastic[M]);
  const HX = [2.95, 3.95]; tab.position.set(HX[0] + 0.3, 0.7, 0); scene.add(tab);
  let thick = 0.3;
  const apply = () => {
    const r = 0.85 + thick * 0.5; ins.wrap.scale.set(r / 0.85, 1, r / 0.85);
    const s = relativeLossShape(thick);
    for (const a of ins.arrows) a.setLength(Math.max(0.25, s * 1), 0.25, 0.15);
    for (const a of bare.arrows) a.setLength(1, 0.25, 0.15);
  };
  apply();
  addDrag(tab, { axis: "x", min: HX[0], max: HX[1], onMove: (x) => { thick = (x - HX[0]) / (HX[1] - HX[0]); apply(); } });

  // qualitative temperature-vs-time curves: no axis numbers (Tesla O2)
  const ui = panel(host, dark);
  const tag = el("strong", null, T("pending", "values pending approval")); tag.style.color = hot; ui.appendChild(tag);
  ui.appendChild(el("p", null, T("card")));
  const cv = el("canvas"); cv.width = 280; cv.height = 140; cv.setAttribute("role", "img"); cv.setAttribute("aria-label", T("graphLabel")); ui.appendChild(cv);
  const ink = dark ? "#EDE6D6" : "#2B2622";
  const q = el("fieldset"); q.append(el("legend", null, T("predict")));
  (text.choices || []).forEach((c, i) => { const l = el("label"); const r = el("input"); r.type = "radio"; r.name = "e3d-ins"; r.value = i; l.append(r, " " + c); q.append(l, el("br")); });
  ui.appendChild(q);
  const go = el("button", null, T("run", "Heat both")); go.disabled = true; ui.appendChild(go);
  const fb = el("p"); ui.appendChild(fb);
  const exB = el("button", null, T("explainBtn", "Explain")); exB.hidden = true; const ex = el("p", null, T("explain")); ex.hidden = true; ui.append(exB, ex);
  q.addEventListener("change", () => { go.disabled = false; });
  exB.addEventListener("click", () => { ex.hidden = false; });
  let t = -1;
  go.addEventListener("click", () => { t = 0; const v = q.querySelector("input:checked"); fb.textContent = v && +v.value === (text.correct ?? 0) ? T("right") : T("wrong"); exB.hidden = false; });
  function draw() {
    const x = cv.getContext("2d"); if (!x) return; const W = cv.width, H = cv.height;
    x.clearRect(0, 0, W, H); x.strokeStyle = ink; x.lineWidth = 1.5;
    x.beginPath(); x.moveTo(20, 8); x.lineTo(20, H - 20); x.lineTo(W - 8, H - 20); x.stroke();
    x.fillStyle = ink; x.font = "12px system-ui"; x.fillText(T("axisT", "temperature"), 24, 14); x.fillText(T("axisX", "time"), W - 40, H - 6);
    const end = t < 0 ? 1 : Math.min(1, t);
    const curve = (k, c, dash) => { x.strokeStyle = c; x.setLineDash(dash); x.beginPath(); for (let i = 0; i <= 60 * end; i++) { const s = i / 60, y = 1 - Math.exp(-s * 4 / k); const px = 20 + s * (W - 30), py = H - 20 - y * (H - 40) * k; i ? x.lineTo(px, py) : x.moveTo(px, py); } x.stroke(); x.setLineDash([]); };
    curve(0.45, ink, [5, 4]); // bare: levels off lower
    curve(0.45 + 0.5 * (1 - relativeLossShape(thick)), hot, []); // insulated: levels off higher
  }
  draw();
  onFrame((dt) => {
    if (t >= 0) { t += dt * (S.reduce ? 1 : 0.3); draw(); if (t > 1) t = -1; } else draw();
  });
  return { ...S, setThickness(v) { thick = v; apply(); }, dispose() { ui.remove(); S.dispose(); } };
}
