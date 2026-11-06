// Every Joule Sim 5. mountKettle: Page 12 ledger (Tesla C6). mountInsulation: jacketed calorimeter vs bare (Tesla approved jacket model).
import { createEnergyScene, toon, palette, isDark } from "./core.js";
import { C_WATER, KETTLE, kettleTime, band5, heatQ, JACKET, lossW, tauS, temperatureC, coolingTimeS, JACKET_ELEMENTS, elementLossW, jacketTotalLossW, jacketEffectiveU } from "./physics.js";

import { panel, jasper, inspector, ribbon, jar, meterScale } from "./ui.js";
const el = (t, c, x) => { const e = document.createElement(t); if (c) e.className = c; if (x != null) e.textContent = x; return e; };
const fill = (s, o) => s.replace(/\{(\w+)\}/g, (_, k) => o[k] ?? "");

export function mountKettle(host, text = {}, opts = {}) {
  const T = (k, d = "") => text[k] ?? d;
  // Leo's kettle sheet: FOV 35, camera (2.8, 2.4, 5.8) -> (0, 0.55, 0), 3.6 x 1.4 m countertop, two real kettles.
  const S = createEnergyScene(host, { fov: 35, camera: [2.8, 2.4, 5.8], target: [0, 0.55, 0], portrait: { fov: 34, camera: [2.5, 2.5, 6.2], target: [0, 0.65, 0] }, ...opts });
  if (!S) return null;
  const { THREE, scene, onFrame } = S;
  const dark = isDark(), M = dark ? "dark" : "light";
  const lbl = (m, t, pos, anchor) => { m.userData.label = t; m.userData.labelPos = pos; if (anchor) m.userData.labelAnchor = anchor; return m; };
  const counter = toon(new THREE.Mesh(new THREE.BoxGeometry(3.6, 0.16, 1.4)), "#B58B60"); counter.position.set(0, 0.08, 0); counter.userData.noFit = true; scene.add(counter); // frame the kettles; the counter runs out of shot
  lbl(counter, T("lblCounter", "countertop"), "below-left", new THREE.Vector3(-1.2, 0.08, 0.7));
  const TOP = 0.16;
  const kettles = [KETTLE.m, KETTLE.m / 2].map((m, i) => {
    const x = i ? 0.6 : -0.6, shell = i ? "#EEE3CC" : "#A9B1B2";
    const g = new THREE.Group(); g.position.set(x, TOP, 0); scene.add(g);
    const base = toon(new THREE.Mesh(new THREE.CylinderGeometry(0.22, 0.22, 0.05, 28)), "#2B2622"); base.position.y = 0.025; g.add(base);
    const body = toon(new THREE.Mesh(new THREE.CylinderGeometry(0.16, 0.2, 0.42, 28)), shell); body.position.y = 0.05 + 0.21; g.add(body);
    const lid = toon(new THREE.Mesh(new THREE.CylinderGeometry(0.15, 0.16, 0.035, 28)), "#2B2622"); lid.position.y = 0.05 + 0.42 + 0.017; g.add(lid);
    const knob = toon(new THREE.Mesh(new THREE.BoxGeometry(0.07, 0.03, 0.04)), "#2B2622"); knob.position.y = lid.position.y + 0.03; g.add(knob);
    const handle = toon(new THREE.Mesh(new THREE.TorusGeometry(0.13, 0.025, 8, 20, Math.PI)), "#2B2622"); handle.rotation.z = Math.PI / 2; handle.position.set(-0.19, 0.28, 0); g.add(handle);
    const spout = toon(new THREE.Mesh(new THREE.ConeGeometry(0.05, 0.14, 3)), shell); spout.rotation.z = -Math.PI / 2 - 0.5; spout.position.set(0.2, 0.42, 0); g.add(spout);
    // water window on the front, water height follows mass
    const win = new THREE.Mesh(new THREE.BoxGeometry(0.07, 0.3, 0.012), new THREE.MeshBasicMaterial({ color: "#FFFFFF", transparent: true, opacity: 0.35 })); win.position.set(0, 0.27, 0.185); g.add(win);
    const wh = 0.3 * (i ? 0.5 : 1);
    const water = new THREE.Mesh(new THREE.BoxGeometry(0.06, wh, 0.014), new THREE.MeshBasicMaterial({ color: "#8EC9F2", transparent: true, opacity: 0.55 })); water.position.set(0, 0.12 + wh / 2, 0.186); g.add(water);
    // switch on the power base, cord
    const sw = toon(new THREE.Mesh(new THREE.BoxGeometry(0.16, 0.035, 0.1)), "#3A3631"); sw.position.set(0.12, 0.02, 0.2); g.add(sw);
    const cord = new THREE.Mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3([new THREE.Vector3(-0.2, 0.02, -0.05), new THREE.Vector3(-0.45, 0.01, -0.3), new THREE.Vector3(-0.6, 0.01, -0.6)]), 12, 0.008, 6), new THREE.MeshBasicMaterial({ color: "#2B2622" })); g.add(cord);
    // thermometer, right of each kettle: glass tube, red liquid, bulb
    const tube = new THREE.Mesh(new THREE.CylinderGeometry(0.025, 0.025, 0.5, 12), new THREE.MeshToonMaterial({ color: "#FFFFFF", transparent: true, opacity: 0.5 })); tube.position.set(0.36, 0.3, 0.05); tube.castShadow = true; g.add(tube);
    const bulb = toon(new THREE.Mesh(new THREE.SphereGeometry(0.04, 12, 10)), "#D8402F"); bulb.position.set(0.36, 0.05, 0.05); g.add(bulb);
    const therm = new THREE.Mesh(new THREE.CylinderGeometry(0.016, 0.016, 1, 8), new THREE.MeshBasicMaterial({ color: "#D8402F" })); g.add(therm);
    const setT = (f) => { const h = 0.08 + 0.38 * f; therm.scale.y = h; therm.position.set(0.36, 0.07 + h / 2, 0.05); }; setT(0);
    const steam = new THREE.Mesh(new THREE.SphereGeometry(0.05, 10, 8), new THREE.MeshBasicMaterial({ color: dark ? "#D8D2C6" : "#FFFFFF", transparent: true, opacity: 0.85 }));
    steam.visible = false; steam.userData.noFit = true; g.add(steam); // steam puff from the spout once boiled
    lbl(body, i ? T("lblHalf", "half kettle") : T("lblFull", "full kettle, 0.230 kg water"), i ? "above-right" : "above-left", new THREE.Vector3(0, 0.15, 0));
    lbl(tube, T("lblTherm", "thermometer 20 to 100 degrees C"), "right", new THREE.Vector3(0, 0.1, 0)); if (i) tube.userData.label = T("lblThermShort", "thermometer");
    if (!i) lbl(win, T("lblWindow", "water volume"), "left");
    if (i) lbl(sw, T("lblSwitch", "kettle switch, 3000 W"), "below-right");
    return { m, setT, steam, t: kettleTime(m) };
  });
  // transfers (round 1): pale-blue electrical input ribbon from the wall splits at each base into orange water thermal
  // and orange kettle-and-air thermal. Width = energy delivered so far (full width = the full kettle's Q); glow = power on.
  const QF = heatQ(KETTLE.m, C_WATER, 80), V = (x, y, z) => new THREE.Vector3(x, y, z);
  const flows = kettles.map((k, i) => {
    const x = i ? 0.6 : -0.6;
    const elec = ribbon(THREE, scene, [V(x - 0.75, TOP + 0.02, 0.45), V(x - 0.45, TOP + 0.02, 0.3), V(x - 0.05, TOP + 0.03, 0)], palette.electrical[M], { width: 0.05, label: i ? undefined : T("lblElec", "electrical input"), labelPos: "above-left" });
    const water = ribbon(THREE, scene, [V(x - 0.05, TOP + 0.04, 0.02), V(x, TOP + 0.2, 0.1), V(x, TOP + 0.12 + 0.3 * (i ? 0.5 : 1) * 0.8, 0.2)], palette.thermal[M], { width: 0.001, label: i ? undefined : T("lblWaterTh", "water thermal"), labelPos: "below-left" });
    const air = ribbon(THREE, scene, [V(x, TOP + 0.5, 0), V(x + 0.15, TOP + 0.75, -0.1), V(x + 0.3, TOP + 0.95, -0.2)], palette.thermal[M], { width: 0.001, label: i ? T("lblAirTh", "kettle and air thermal: 0 at eta = 1") : undefined, labelPos: "above-right" });
    // state 0: full-path pale ghost ribbons so the route reads before the run
    elec.set(0.09, 1).glow(0.5); water.set(0.06, 1).glow(0.4); air.set(0.02, 1).glow(0.3); return { elec, water, air, Q: heatQ(k.m, C_WATER, 80) };
  });
  const phone = (host.clientWidth || innerWidth) < 600;
  const thermometerCards = [];
  if (phone) {
    scene.traverse((o) => { if (o.userData.label) o.userData.labelPosMobile = "none"; });
    const cols = el("div", "e3d-hud e3d-kettle-columns"); cols.style.cssText = `position:absolute;left:6px;right:6px;top:6px;display:grid;grid-template-columns:1fr 1fr;gap:8px;z-index:2;color:${dark ? "#EDE6D6" : "#2B2622"};font-size:16px`;
    for (const [i, name] of ["Full: 0.230 kg", "Half: 0.115 kg"].entries()) { const c = el("div"); c.style.cssText = `padding:4px;border:1.5px solid currentColor;border-radius:8px;background:${dark ? "#1F1D1A" : "#FBF6EA"}`; c.append(el("div", null, name)); const temp = el("div", null, "20 degrees C"); c.append(temp); thermometerCards.push(temp); cols.append(c); }
    host.append(cols);
  }
  const MJ = { e: jar(THREE, scene, toon, 0, 0, palette.electrical[M]), w: jar(THREE, scene, toon, 0, 0, palette.thermal[M]), he: jar(THREE, scene, toon, 0, 0, palette.electrical[M]), hw: jar(THREE, scene, toon, 0, 0, palette.thermal[M]) };
  MJ.e.glass.userData.label = T("acct_elec", "electrical in, full kettle"); MJ.w.glass.userData.label = T("acct_water", "water thermal, full kettle"); MJ.he.glass.userData.label = T("acct_elec_half", "electrical in, half kettle"); MJ.hw.glass.userData.label = T("acct_water_half", "water thermal, half kettle");
  meterScale(scene, (QF / 1000).toFixed(1), "kJ");
  const ui = panel(host, dark, T("takeaway"), T("question", "How long will 3000 W take to heat 0.230 kg of water from 20 to 100 degrees C? And half the water?"));
  inspector(host, ["Q = m C delta T", "C = specific heat capacity, J/(kg K)", "C_water = 4180 J/(kg K)", "0.230 kg, 3000 W, eta = 1", "20 to 100 degrees C, delta T = 80 K"], ["Ideal minimum heating time in this model: 25.6 s", "Band 24.36 to 26.92 s (model inputs)", "Half the mass: half the energy, half the ideal time"]);
  jasper(host, "kettle", T("jasperCard"));
  ui.append(el("div", null, T("formula")), el("div", null, fill(T("defaults"), { m: KETTLE.m.toFixed(3), P: KETTLE.P, C: C_WATER })));
  const lab = el("label", null, T("predictLabel")); const inp = el("input"); inp.type = "number"; inp.step = "0.1"; inp.setAttribute("aria-label", T("predictLabel"));
  ui.append(lab, inp);
  const go = el("button", null, T("switch", "Switch on")); go.disabled = true; ui.appendChild(go);
  const out = el("p"); ui.appendChild(out);
  const exB = el("button", null, T("explainBtn", "Explain")); exB.hidden = true; const ex = el("p", null, T("explain")); ex.hidden = true; ui.append(exB, ex);
  inp.addEventListener("input", () => { go.disabled = !(+inp.value > 0); });
  exB.addEventListener("click", () => { ex.hidden = false; });
  // round 2: stage clock and result card, so the run itself proves 25.6 s and the half-mass halving
  const clock = el("div", "e3d-hud e3d-inset"); clock.style.cssText = `position:absolute;left:50%;transform:translateX(-50%);top:48px;z-index:2;padding:4px 10px;border:1.5px solid ${dark ? "#EDE6D6" : "#2B2622"};border-radius:10px;background:${dark ? "rgba(31,29,26,.94)" : "rgba(251,246,234,.95)"};color:${dark ? "#EDE6D6" : "#2B2622"};font:16px/1.25 'Patrick Hand','Gochi Hand',cursive;font-variant-numeric:tabular-nums;max-width:min(360px,70%);text-align:center;pointer-events:none`;
  clock.hidden = true; if (phone) clock.style.top = "72px"; host.appendChild(clock);
  let t = -1;
  go.addEventListener("click", () => {
    t = 0; go.disabled = true; clock.hidden = false;
    const [lo, hi] = band5(kettles[0].t), p = +inp.value;
    out.textContent = fill(T(p >= lo && p <= hi ? "right" : "wrong"), { Q: Math.round(heatQ(KETTLE.m, C_WATER, 80)), t: kettles[0].t.toFixed(1), half: kettles[1].t.toFixed(1), lo: lo.toFixed(2), hi: hi.toFixed(2) });
    exB.hidden = false;
  });
  onFrame((dt) => {
    if (t < 0) return;
    t += dt * (S.reduce ? 8 : 4); // 4x model time so the run fits on screen
    const tm = Math.min(t, kettles[0].t); clock.textContent = fill(T("clock", "model time {t} s (4x)  full: {f}  half: {h}"), { t: tm.toFixed(1), f: tm >= kettles[0].t ? "done" : "heating", h: tm >= kettles[1].t ? "done at " + kettles[1].t.toFixed(1) + " s" : "heating" });
    for (const k of kettles) {
      const f = Math.min(1, t / k.t); k.setT(f); if (thermometerCards.length) thermometerCards[kettles.indexOf(k)].textContent = (20 + 80 * f).toFixed(0) + " degrees C";
      const F = flows[kettles.indexOf(k)], q = f * F.Q / QF; // share of the full kettle's Q delivered so far
      F.elec.set(0.05, 1).glow(f < 1 ? 1 : 0.1); F.water.set(0.02 + 0.14 * q, Math.max(0.05, f)); F.air.set(0.004, f < 1 ? 1 : 0.001);
      if (k === kettles[0]) { MJ.e.set(f); MJ.w.set(f * KETTLE.eta); } else { MJ.he.set(f * F.Q / QF); MJ.hw.set(f * KETTLE.eta * F.Q / QF); }
      k.steam.visible = f >= 1; if (k.steam.visible) { const u = t % 0.6; k.steam.position.set(0.3 + u * 0.1, 0.5 + u * 0.4, 0); k.steam.scale.setScalar(1 + u * 2); }
    }
    if (t > kettles[0].t) { t = -1; go.disabled = false;
      clock.innerHTML = ""; for (const line of [fill(T("doneLine", "Ideal minimum heating time in this model: {t} s"), { t: kettles[0].t.toFixed(1) }), T("bandLine", "band 24.36 to 26.92 s (model inputs)"), fill(T("halfLine", "half the water: {q} kJ, {h} s"), { q: (flows[1].Q / 1000).toFixed(1), h: kettles[1].t.toFixed(1) }), fill(T("proveLine", "Energy needed: {q} kJ (joules). Power: 3000 W = 3000 J each second."), { q: (flows[0].Q / 1000).toFixed(1) })]) clock.append(el("div", null, line)); }
  });
  return { ...S, dispose() { ui.remove(); S.dispose(); } };
}

export function mountInsulation(host, text = {}, opts = {}) {
  const T = (k, d = "") => text[k] ?? d;
  // Leo's insulation sheet: FOV 36, camera (3.1, 3.0, 5.6) -> (0, 0.55, 0); two matching cutaway calorimeters, bare left, jacketed right.
  const S = createEnergyScene(host, { fov: 36, camera: [3.1, 3.0, 5.6], target: [0, 0.55, 0], portrait: { fov: 34, camera: [2.8, 2.8, 6.5], target: [0, 0.7, 0] }, ...opts });
  if (!S) return null;
  const { THREE, scene, addDrag, onFrame } = S;
  const dark = isDark(), M = dark ? "dark" : "light", hot = palette.thermal[M];
  const lbl = (m, t, pos, anchor) => { m.userData.label = t; m.userData.labelPos = pos; if (anchor) m.userData.labelAnchor = anchor; return m; };
  const CORK = "#C6A273", CUT = Math.PI / 3, FACE = Math.atan2(3.1, 5.6); // 60 degree cutaway, centred on the camera direction
  const slab = toon(new THREE.Mesh(new THREE.BoxGeometry(3.2, 0.06, 1.8)), dark ? "#6F665A" : "#E6DCC6"); slab.position.y = 0.03; slab.userData.noFit = true; scene.add(slab);
  const Y0 = 0.06 + 0.1; // vessels stand on a base-height plinth so the base piece fits underneath
  const vessel = (x) => {
    const g = new THREE.Group(); g.position.set(x, Y0, 0); scene.add(g);
    const outer = new THREE.Mesh(new THREE.CylinderGeometry(0.27, 0.27, 0.55, 32, 1, true, FACE + CUT / 2, Math.PI * 2 - CUT), null); toon(outer, "#A9B1B2"); outer.material.side = THREE.DoubleSide; outer.position.y = 0.275; g.add(outer); // gap faces the camera
    const floor = toon(new THREE.Mesh(new THREE.CylinderGeometry(0.27, 0.27, 0.02, 32)), "#A9B1B2"); floor.position.y = 0.01; g.add(floor);
    const water = new THREE.Mesh(new THREE.CylinderGeometry(0.245, 0.245, 0.34, 32), new THREE.MeshBasicMaterial({ color: "#8EC9F2", transparent: true, opacity: 0.4, depthWrite: false })); water.position.y = 0.19; g.add(water);
    const sample = toon(new THREE.Mesh(new THREE.BoxGeometry(0.14, 0.14, 0.14)), "#F07A1E"); sample.position.set(0, 0.12, 0.05); g.add(sample);
    // thermometer in the water: red column rises as Heat both runs (no numbers)
    const tube = new THREE.Mesh(new THREE.CylinderGeometry(0.03, 0.03, 0.62, 10), new THREE.MeshToonMaterial({ color: "#FFFFFF", transparent: true, opacity: 0.55 })); tube.position.set(0.33, 0.33, 0.12); g.add(tube); const tb = toon(new THREE.Mesh(new THREE.SphereGeometry(0.045, 12, 10)), "#D8402F"); tb.position.set(0.33, 0.04, 0.12); g.add(tb);
    const col = new THREE.Mesh(new THREE.CylinderGeometry(0.02, 0.02, 1, 8), new THREE.MeshBasicMaterial({ color: "#D8402F" })); g.add(col);
    const setT = (v) => { const h = 0.06 + v * 0.5; col.scale.y = h; col.position.set(0.33, 0.06 + h / 2, 0.12); };
    // four loss arrows (relative width only): lid up, wall sideways, window front, base down
    const mk = (dir, at, name) => { const a = new THREE.ArrowHelper(dir.clone().normalize(), at, 0.3, new THREE.Color(hot).getHex(), 0.09, 0.06); a.userData.noFit = true; g.add(a); return a; };
    const arrows = { lid: mk(new THREE.Vector3(0, 1, 0), new THREE.Vector3(0.12, 0.62, 0), "lid"), wall: mk(new THREE.Vector3(-1, 0, 0), new THREE.Vector3(-0.38, 0.3, 0), "wall"), window: mk(new THREE.Vector3(0.3, 0, 1), new THREE.Vector3(0.12, 0.3, 0.3), "window"), base: mk(new THREE.Vector3(0, -1, 0), new THREE.Vector3(0.18, -0.02, 0.18), "base") };
    return { g, outer, water, sample, setT, arrows };
  };
  const bare = vessel(-0.75), ins = vessel(0.75);
  lbl(bare.outer, T("lblBare", "bare calorimeter"), "above-left", new THREE.Vector3(-0.2, 0.25, 0));
  lbl(ins.outer, T("lblIns", "insulated calorimeter"), "above-right", new THREE.Vector3(0.2, 0.25, 0));
  lbl(bare.sample, T("lblSample", "hot sample"), "below-left");
  lbl(bare.water, T("lblWater", "cold water"), "left", new THREE.Vector3(-0.24, 0.12, 0));
  lbl(bare.arrows.lid.line, T("lblLoss", "heat loss: declared lumped cooling model"), "below-left", new THREE.Vector3(-0.05, -0.05, 0));
  // insulation pieces for the right vessel, each pulled away independently by its own handle
  const IX = 0.75, J = {};
  J.lid = toon(new THREE.Mesh(new THREE.CylinderGeometry(0.31, 0.31, 0.08, 32)), CORK); J.lid.position.set(IX, Y0 + 0.59, 0); scene.add(J.lid);
  const knob = toon(new THREE.Mesh(new THREE.TorusGeometry(0.05, 0.015, 8, 16)), "#8A6E4B"); knob.position.y = 0.06; J.lid.add(knob);
  J.wrap = toon(new THREE.Mesh(new THREE.CylinderGeometry(0.36, 0.36, 0.58, 32, 1, true, FACE + CUT / 2, Math.PI * 2 - CUT)), CORK); J.wrap.material.side = THREE.DoubleSide; J.wrap.position.set(IX, Y0 + 0.29, 0); scene.add(J.wrap);
  J.base = toon(new THREE.Mesh(new THREE.CylinderGeometry(0.32, 0.32, 0.08, 32)), CORK); J.base.position.set(IX, Y0 - 0.05, 0); scene.add(J.base);
  J.win = new THREE.Group(); J.win.position.set(IX + 0.2, Y0 + 0.3, 0.33); scene.add(J.win);
  for (const dz of [-0.04, 0.04]) { const pane = new THREE.Mesh(new THREE.BoxGeometry(0.22, 0.26, 0.012), new THREE.MeshToonMaterial({ color: "#A88AC2", transparent: true, opacity: 0.55 })); pane.position.z = dz; J.win.add(pane); }
  const frame = toon(new THREE.Mesh(new THREE.BoxGeometry(0.24, 0.02, 0.05)), "#7A6390"); frame.position.y = -0.14; J.win.add(frame); for (const [w2, h2, x2, y2] of [[0.24, 0.02, 0, 0.14], [0.02, 0.3, -0.12, 0], [0.02, 0.3, 0.12, 0]]) { const fr = toon(new THREE.Mesh(new THREE.BoxGeometry(w2, h2, 0.11)), "#7A6390"); fr.position.set(x2, y2, 0); J.win.add(fr); } // two panes, visible gap, full frame
  lbl(J.lid, T("lblLid", "lid"), "above"); lbl(J.wrap, T("lblWrap", "wall wrap"), "right", new THREE.Vector3(0.36, 0, 0)); lbl(J.base, T("lblBase", "base"), "below");
  lbl(frame, T("lblWin", "double-layer window insert"), "below-right");
  // hot sample: lift over the rims and drop into either calorimeter (XZ drag, snaps to the nearer vessel; the samples swap)
  const SX = [0, 1.5]; // local x of the two vessels from the bare group
  addDrag(bare.sample, { axis: "xz", min: [-0.25, -0.25], max: [1.75, 0.35],
    onMove: (p) => { p.y = 0.82; },
    onUp: (m) => { const k = Math.abs(m.position.x - SX[0]) < Math.abs(m.position.x - SX[1]) ? 0 : 1; m.position.set(SX[k], 0.12, 0.05); ins.sample.visible = k === 0; } });
  const pull = { lid: 0, wrap: 0, base: 0, win: 0 }, PMAX = { lid: 0.45, wrap: 0.3, base: 0.22, win: 0.3 };
  const KEYS = ["lid", "wrap", "base", "win"];
  const ARROW = { lid: "lid", wrap: "wall", win: "window", base: "base" };
  let roomC = JACKET.roomTempSlider.default, modelT = 0, cooling = false;
  const placed = { lid: false, wrap: false, base: false, win: false };
  const bareT = () => temperatureC(JACKET.bareU_WPerM2K, modelT, roomC);
  const insU = () => jacketEffectiveU(placed);
  const insT = () => temperatureC(insU(), modelT, roomC);
  const scaleLen = (W, maxW) => 0.08 + 0.34 * Math.max(0, Math.min(1, W / maxW));
  const apply = () => {
    const Tb = bareT(), Ti = insT(), maxW = lossW(JACKET.bareU_WPerM2K, JACKET.startTempC, roomC);
    for (const k of KEYS) {
      const Wb = elementLossW(k, false, Tb, roomC), Wi = elementLossW(k, placed[k], Ti, roomC);
      bare.arrows[ARROW[k]].setLength(scaleLen(Wb, maxW), 0.09, 0.06);
      ins.arrows[ARROW[k]].setLength(scaleLen(Wi, maxW), 0.09, 0.06);
      if (LM[k]) LM[k].set(Wi / maxW);
    }
    bare.setT(Math.max(0, (Tb - roomC) / (JACKET.startTempC - roomC)));
    ins.setT(Math.max(0, (Ti - roomC) / (JACKET.startTempC - roomC)));
  };
  let dragging = null; const dragOk = () => typeof ranked === "function" && ranked(); let dropped = () => {};
  addDrag(J.lid, { axis: "y", min: Y0 + 0.59, max: Y0 + 0.59 + PMAX.lid, onMove: (y) => { if (!dragOk()) return; dragging = "lid"; pull.lid = y - (Y0 + 0.59); }, onUp: () => dropped("lid") });
  addDrag(J.wrap, { axis: "x", min: IX, max: IX + PMAX.wrap, onMove: (x) => { if (!dragOk()) return; dragging = "wrap"; pull.wrap = x - IX; }, onUp: () => dropped("wrap") });
  addDrag(J.base, { axis: "y", min: Y0 - 0.05 - PMAX.base, max: Y0 - 0.05, onMove: (y) => { if (!dragOk()) return; dragging = "base"; pull.base = Y0 - 0.05 - y; }, onUp: () => dropped("base") });
  addDrag(J.win, { axis: "z", min: 0.33, max: 0.33 + PMAX.win, onMove: (z) => { if (!dragOk()) return; dragging = "win"; pull.win = z - 0.33; }, onUp: () => dropped("win") });

  const LONG = "Declared educational calorimeter-jacket model, not measured lab data. Steady loss meters use declared jacket U-values and areas. Cooling uses a declared lumped-capacity model: water and container share one temperature, room temperature stays fixed, and effective U and heat capacity stay constant. Evaporation, leaks, separate jacket heat storage, and changing radiation or convection are not resolved.";
  const SHORT = "Declared lumped cooling model; not lab measurements.";
  jasper(host, "insulation", T("jasperCard", "ENERGY OR RATE?"));
  const ui = panel(host, dark, T("takeaway"), T("question", "Which addition cuts heat loss most: lid, wall wrap, base, or window? Rank all four."));
  const take = host.querySelector(":scope > .e3d-take"); if (take) take.style.cssText += ";right:auto;max-width:min(520px,58%);padding-right:8px";
  const setup = inspector(host, [
    "water 0.230 kg, C_eff 1000 J/K, A 0.060 m^2, T0 60 C, target 40 C",
    "U_bare 8, U_insulated 2 W/(m^2 K); P_loss = U A (T - T_room)",
    SHORT,
    LONG
  ], []);
  if ((host.clientWidth || innerWidth) >= 600) setup.style.top = "78px";
  const tag = el("strong", null, T("shortLabel", SHORT)); tag.style.color = dark ? "#FF9D4D" : "#B4530A"; ui.appendChild(tag);
  ui.appendChild(el("p", null, T("card", LONG)));
  const roomRow = el("label", null, T("roomLabel", "Room temperature (C) "));
  const room = el("input"); room.type = "range"; room.min = JACKET.roomTempSlider.min; room.max = JACKET.roomTempSlider.max; room.step = JACKET.roomTempSlider.step; room.value = JACKET.roomTempSlider.default; room.setAttribute("aria-label", "Room temperature in degrees Celsius"); room.style.minHeight = "44px";
  const roomVal = el("span", null, String(roomC)); roomRow.append(room, " ", roomVal); ui.appendChild(roomRow);
  const readout = el("div", "e3d-jacket-readout"); readout.style.cssText = "font-variant-numeric:tabular-nums;font-size:16px;line-height:1.35;max-width:100%;overflow-wrap:anywhere"; ui.appendChild(readout);
  const fmtMin = (s) => (s / 60).toFixed(2);
  const refreshReadout = () => {
    const Pb = lossW(JACKET.bareU_WPerM2K, JACKET.startTempC, roomC);
    const Pi = lossW(JACKET.insulatedU_WPerM2K, JACKET.startTempC, roomC);
    const tb = coolingTimeS(JACKET.bareU_WPerM2K, JACKET.targetTempC, roomC);
    const ti = coolingTimeS(JACKET.insulatedU_WPerM2K, JACKET.targetTempC, roomC);
    const PnowB = lossW(JACKET.bareU_WPerM2K, bareT(), roomC);
    const PnowI = jacketTotalLossW(placed, insT(), roomC);
    readout.innerHTML = "";
    for (const line of [
      fill(T("initLoss", "Initial loss at {dT} K: bare {b} W, insulated {i} W"), { dT: (JACKET.startTempC - roomC).toFixed(0), b: Pb.toFixed(2), i: Pi.toFixed(2) }),
      fill(T("tauLine", "tau: bare {tb} min, insulated {ti} min"), { tb: fmtMin(tauS(JACKET.bareU_WPerM2K)), ti: fmtMin(tauS(JACKET.insulatedU_WPerM2K)) }),
      fill(T("coolLine", "Time 60 to 40 C: bare {tb} min, insulated {ti} min"), { tb: fmtMin(tb), ti: fmtMin(ti) }),
      fill(T("nowLine", "Current model time {t} s: bare {b} W at {Tb} C, jacket {i} W at {Ti} C"), { t: modelT.toFixed(0), b: PnowB.toFixed(2), Tb: bareT().toFixed(1), i: PnowI.toFixed(2), Ti: insT().toFixed(1) })
    ]) readout.append(el("div", null, line));
  };
  const PIECES = [["lid", "lid"], ["wrap", "wall wrap"], ["base", "base"], ["win", "window insert"]];
  const rank = el("fieldset"); rank.append(el("legend", null, T("rankLegend", "Rank the four additions by expected loss reduction (1 = most)")));
  const sels = [1, 2, 3, 4].map((n) => { const l = el("label", null, n + " "); const sl = el("select"); sl.style.minHeight = "44px"; sl.append(el("option", null, "")); for (const [k, d] of PIECES) { const o = el("option", null, T("piece_" + k, d)); o.value = k; sl.append(o); } l.append(sl); rank.append(l, el("br")); return sl; });
  ui.appendChild(rank);
  const tray = el("div", "e3d-tray"); tray.setAttribute("aria-label", "Four independently placeable insulation pieces"); tray.style.cssText = "display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:8px;width:100%;font-size:16px"; ui.appendChild(tray);
  const btn = {}; for (const [k, d] of PIECES) { const b = el("button", null, T("place", "Place") + " " + T("piece_" + k, d)); b.type = "button"; b.disabled = true; b.style.cssText = "min-height:64px;white-space:normal;font-size:16px;min-width:0"; b.setAttribute("aria-pressed", "false"); b.addEventListener("click", () => { placed[k] = !placed[k]; b.setAttribute("aria-pressed", String(placed[k])); b.textContent = (placed[k] ? T("remove", "Remove") : T("place", "Place")) + " " + T("piece_" + k, d); modelT = 0; cooling = false; apply(); refreshReadout(); stamp(); }); btn[k] = b; tray.appendChild(b); }
  const cool = el("button", null, T("run", "Cool both")); cool.disabled = true; ui.appendChild(cool);
  const fb = el("p"); ui.appendChild(fb);
  const exB = el("button", null, T("explainBtn", "Explain")); exB.hidden = true; const ex = el("p", null, T("explain")); ex.hidden = true; ui.append(exB, ex);
  exB.addEventListener("click", () => { ex.hidden = false; });
  const ranked = () => { const v = sels.map((x) => x.value); return v.every(Boolean) && new Set(v).size === 4; };
  const stamp = () => {
    if (!ranked()) return;
    const Pb = lossW(JACKET.bareU_WPerM2K, JACKET.startTempC, roomC);
    const Pi = jacketTotalLossW(placed, JACKET.startTempC, roomC);
    if (Pi < 0.5 * Pb) { fb.textContent = fill(T("stampOk", "Declared model stamp: jacket {i} W is below half of bare {b} W."), { i: Pi.toFixed(2), b: Pb.toFixed(2) }); fb.dataset.done = "1"; }
    else { fb.textContent = fill(T("stampWait", "Jacket {i} W is still at least half of bare {b} W. Place more pieces."), { i: Pi.toFixed(2), b: Pb.toFixed(2) }); delete fb.dataset.done; }
  };
  rank.addEventListener("change", () => { const ok = ranked(); for (const k in btn) btn[k].disabled = !ok; cool.disabled = !ok; fb.textContent = ok ? T("rankDone", "Ranking locked in. Place the pieces and watch each watt meter.") : ""; if (ok) { sels.forEach((x) => { x.disabled = true; }); exB.hidden = false; stamp(); } });
  room.addEventListener("input", () => { roomC = +room.value; roomVal.textContent = String(roomC); modelT = 0; cooling = false; apply(); refreshReadout(); stamp(); });
  cool.addEventListener("click", () => { if (!ranked()) return; cooling = !cooling; if (!cooling) cool.textContent = T("run", "Cool both"); else { cool.textContent = T("stop", "Stop"); if (modelT <= 0) modelT = 0; } });
  dropped = (k) => { dragging = null; placed[k] = pull[k] < PMAX[k] / 2; const d = PIECES.find((p2) => p2[0] === k)[1]; btn[k].textContent = (placed[k] ? T("remove", "Remove") : T("place", "Place")) + " " + T("piece_" + k, d); btn[k].setAttribute("aria-pressed", String(placed[k])); modelT = 0; cooling = false; apply(); refreshReadout(); stamp(); };
  for (const k in pull) pull[k] = PMAX[k];
  const home = { lid: (v) => { J.lid.position.y = Y0 + 0.59 + v; }, wrap: (v) => { J.wrap.position.x = IX + v; }, base: (v) => { J.base.position.y = Y0 - 0.05 - v; }, win: (v) => { J.win.position.z = 0.33 + v; } };
  const LM = {}; for (const [k, d] of [["lid", "lid loss"], ["wrap", "wall loss"], ["win", "window loss"], ["base", "base loss"]]) { LM[k] = jar(THREE, scene, toon, 0, 0, hot); LM[k].glass.userData.label = T("loss_" + k, d); }
  meterScale(scene, lossW(JACKET.bareU_WPerM2K).toFixed(2), "W", false);
  ins.arrows.lid.line.userData.label = T("loss_lid", "lid loss"); ins.arrows.wall.line.userData.label = T("loss_wrap", "wall loss"); ins.arrows.window.line.userData.label = T("loss_win", "window loss"); ins.arrows.base.line.userData.label = T("loss_base", "base loss");
  for (const [a2, pos] of [["lid", "above"], ["wall", "left"], ["window", "below-right"], ["base", "below"]]) ins.arrows[a2].line.userData.labelPos = pos;
  onFrame((dt) => {
    let moved = false;
    for (const k in placed) { if (k === dragging) continue; const target = placed[k] ? 0 : PMAX[k], v = pull[k] + (target - pull[k]) * Math.min(1, dt * 8); if (Math.abs(v - pull[k]) > 1e-4) { pull[k] = v; home[k](v); moved = true; } }
    if (cooling) { modelT += dt * 60; /* 60x: one real second draws one model minute */ if (insT() <= JACKET.targetTempC + 0.05 && bareT() <= JACKET.targetTempC + 0.05) { cooling = false; cool.textContent = T("run", "Cool both"); } }
    if (moved || cooling) apply();
    if (cooling) refreshReadout();
  });
  for (const k in pull) home[k](pull[k]); apply(); refreshReadout();
  return { ...S, setThickness(v) { for (const k in pull) pull[k] = (1 - v) * PMAX[k]; apply(); }, dispose() { ui.remove(); S.dispose(); } };
}
