// Gases & Thermodynamics: page wiring.
// Physics and data: gas-physics.js. Drawing: gas-render.js.

import { forwardStudyQuery } from "../board-return.js?v=20261022a";
import {
  loadImages, readTokens, sceneView, drawApparatus, axes, line, dot, label, legend, bars, GAS_COLORS
} from "./gas-render.js";
import {
  GASES, GAS_IDS, KB, NA, R, L, P_ATM, T_ICE, cv, cp, gamma, pressure, volume, meanKE, internalEnergy,
  vRms, vMean, vProbable, mbPdf, mbFractionAbove, moleculeMass, kineticPressure, rng, makeParticles, newParticle,
  rescale, stepParticles, meanSquare, speedOf, dotCount, isochoricHeat, isobaricHeat, isothermalHeat, isothermalTo,
  adiabaticTo, isothermCurve, adiabatCurve, carnotCycle, carnotState, SOURCES, WEIGHTS, MAX_WEIGHTS, weightPressure,
  sandboxStep, settle, V_MIN, V_MAX, ART, pistonTopFor, SLIDERS, fromSlider, toSlider, BASE, P_BASE, LAWS, LAW_IDS,
  lawState, MODES, parseQuery, sig, fmtSigned, kPa, litres, kelvin, celsius, sci
} from "./gas-physics.js";

const $ = (id) => document.getElementById(id);
const $$ = (sel, root = document) => [...root.querySelectorAll(sel)];
const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
const THEME_KEY = "popboard.gasthermo.theme";
let T = readTokens();
const q = parseQuery(location.search);
let dirty = true;
const img = loadImages(() => { dirty = true; });
const rand = rng(20261028);

const st = {
  mode: q.mode,
  gas: q.gas || "n2",
  kin: { n: BASE.n, T: BASE.T, V: BASE.V },
  law: q.law || "boyle",
  lawX: { boyle: BASE.V, charles: 300, gaylussac: 300, avogadro: BASE.n },
  speeds: { T: 300 },
  energy: { T: 300 },
  fl: { proc: "isochoric", sign: 1, Q: 60 },
  pv: { proc: "isothermal", dir: -1, ratio: 1.5 },
  eng: { Th: 600, Tc: 300, u: 0, running: !reducedMotion },
  box: { n: BASE.n, T: 300, V: BASE.V, locked: false, weights: [], source: "none", Pext: P_ATM, path: [] },
  running: !reducedMotion
};
st.box = settle(st.box);

// ---------- theme ----------
function applyTheme(t, save) {
  document.documentElement.setAttribute("data-theme", t);
  if (save) { try { localStorage.setItem(THEME_KEY, t); } catch (e) {} }
  $("themeBtn").setAttribute("aria-pressed", String(t === "dark"));
  $("themeLabel").textContent = t === "dark" ? "Light" : "Dark";
  $("themeBtn").setAttribute("aria-label", t === "dark" ? "Switch to light mode" : "Switch to dark mode");
  T = readTokens(); dirty = true;
}
$("themeBtn").addEventListener("click", () => applyTheme(T.dark ? "light" : "dark", true));
const darkMQ = window.matchMedia("(prefers-color-scheme: dark)");
darkMQ.addEventListener?.("change", (e) => {
  let saved = null; try { saved = localStorage.getItem(THEME_KEY); } catch (err) {}
  if (!saved) applyTheme(e.matches ? "dark" : "light", false);
});
applyTheme(document.documentElement.getAttribute("data-theme") === "dark" ? "dark" : "light", false);

// ---------- the state each mode shows in the cylinder ----------
const gasOf = () => GASES[st.mode === "engine" ? "he" : st.gas];
function current() {
  const g = gasOf();
  switch (st.mode) {
    case "kinetic": { const k = st.kin; return { n: k.n, T: k.T, V: k.V, P: pressure(k.n, k.T, k.V), source: "none", heat: 0 }; }
    case "laws": { const s = lawState(st.law, st.lawX[st.law]); return { ...s, source: "none", heat: 0 }; }
    case "speeds": return { n: BASE.n, T: st.speeds.T, V: BASE.V, P: pressure(BASE.n, st.speeds.T, BASE.V), source: heatFor(st.speeds.T).source, heat: heatFor(st.speeds.T).heat };
    case "energy": return { n: BASE.n, T: st.energy.T, V: BASE.V, P: pressure(BASE.n, st.energy.T, BASE.V), source: heatFor(st.energy.T).source, heat: heatFor(st.energy.T).heat };
    case "firstlaw": { const r = flResult(); return { n: BASE.n, T: r.T2, V: r.V2, P: r.P2, source: st.fl.sign > 0 ? "plate" : "ice", heat: st.fl.sign > 0 ? Math.min(1, st.fl.Q / 150) : 0, locked: st.fl.proc === "isochoric", r }; }
    case "pv": { const r = pvResult(); return { n: BASE.n, T: r.T2, V: r.V2, P: r.P2, source: "none", heat: 0, locked: false, r }; }
    case "engine": {
      const c = engCycle(), s = carnotState(g, BASE.n, c, st.eng.u);
      return { n: BASE.n, T: s.T, V: s.V, P: s.P, source: s.leg === 0 ? "burner" : s.leg === 2 ? "ice" : "none", heat: s.leg === 0 ? 1 : 0, c, s };
    }
    default: { const b = st.box; return { n: b.n, T: b.T, V: b.V, P: b.P, source: b.source, heat: b.source === "burner" ? 1 : b.source === "plate" ? 0.6 : 0, locked: b.locked, weights: b.weights }; }
  }
}
// A heat source that fits a temperature: ice bath below 280 K, burner above 320 K.
function heatFor(Tk) {
  if (Tk < 280) return { source: "ice", heat: 0 };
  if (Tk > 320) return { source: "burner", heat: Math.min(1, (Tk - 320) / 280) };
  return { source: "none", heat: 0 };
}
const flResult = () => {
  const g = GASES[st.gas], Q = st.fl.sign * st.fl.Q;
  if (st.fl.proc === "isochoric") return isochoricHeat(g, BASE.n, BASE.T, BASE.V, Q);
  if (st.fl.proc === "isobaric") return isobaricHeat(g, BASE.n, BASE.T, BASE.V, Q);
  return isothermalHeat(g, BASE.n, BASE.T, BASE.V, Q);
};
const pvResult = () => {
  const g = GASES[st.gas], V2 = BASE.V * (st.pv.dir > 0 ? st.pv.ratio : 1 / st.pv.ratio);
  return st.pv.proc === "isothermal" ? isothermalTo(g, BASE.n, BASE.T, BASE.V, V2) : adiabaticTo(g, BASE.n, BASE.T, BASE.V, V2);
};
const ENG_VA = 1 * L, ENG_VB = 1.5 * L;
const engCycle = () => carnotCycle(GASES.he, BASE.n, st.eng.Th, st.eng.Tc, ENG_VA, ENG_VB);

// ---------- particles ----------
let parts = [], partsKey = "", partsT = 300;
const boxOf = (V) => ({ x0: ART.bore.x0, x1: ART.bore.x1, y0: pistonTopFor(V) + ART.piston.height, y1: ART.bore.floor });
const radiusOf = (g) => ({ "particle-xs": 5, "particle-s": 6.5, "particle-m": 8, "particle-l": 10 })[g.sprite];
function syncParticles(cur) {
  const mix = st.mode === "energy" ? ["he", "ar"] : [gasOf().id];
  const count = st.mode === "energy" ? 24 : st.mode === "speeds" ? 150 : dotCount(cur.n);
  const key = mix.join("+") + ":" + st.mode;
  const box = boxOf(cur.V);
  if (key !== partsKey) {
    parts = []; partsKey = key; partsT = cur.T;
    for (const id of mix) for (const p of makeParticles(GASES[id], cur.T, count, box, rand, radiusOf(GASES[id]))) parts.push({ ...p, gas: id });
    return;
  }
  if (Math.abs(cur.T - partsT) > 1e-9) { rescale(parts, partsT, cur.T); partsT = cur.T; }
  if (st.mode !== "energy") {
    const id = mix[0];
    while (parts.length < count) parts.push({ ...newParticle(GASES[id], cur.T, box, rand, radiusOf(GASES[id])), gas: id });
    if (parts.length > count) parts.length = count;
  }
  for (const p of parts) {
    const r = radiusOf(GASES[p.gas]);
    p.x = Math.min(box.x1 - r, Math.max(box.x0 + r, p.x)); p.y = Math.min(box.y1 - r, Math.max(box.y0 + r, p.y));
  }
}
let flashes = [];

// ---------- controls built per mode ----------
const SLIDER_UI = {
  kinetic: [["T", "Temperature T"], ["V", "Volume V"], ["n", "Amount n"]],
  laws: [],
  speeds: [["T", "Temperature T"]],
  energy: [["T", "Temperature T"]],
  firstlaw: [["Q", "Heat |Q|"]],
  pv: [["ratio", "Volume change factor"]],
  engine: [["Th", "Hot side T\u2095"], ["Tc", "Cold side T\u1d9c"]],
  sandbox: [["T", "Temperature T"], ["n", "Amount n"], ["V", "Volume V (locked piston)"]]
};
const LAW_SLIDER = { boyle: ["V", "Volume V"], charles: ["T", "Temperature T"], gaylussac: ["T", "Temperature T"], avogadro: ["n", "Amount n"] };
function sliderList() { return st.mode === "laws" ? [LAW_SLIDER[st.law]] : SLIDER_UI[st.mode]; }
const get = {
  T: () => (st.mode === "kinetic" ? st.kin.T : st.mode === "speeds" ? st.speeds.T : st.mode === "energy" ? st.energy.T : st.mode === "laws" ? st.lawX[st.law] : st.box.T),
  V: () => (st.mode === "kinetic" ? st.kin.V : st.mode === "laws" ? st.lawX.boyle : Math.min(SLIDERS.V.max, Math.max(SLIDERS.V.min, st.box.V))),
  n: () => (st.mode === "kinetic" ? st.kin.n : st.mode === "laws" ? st.lawX.avogadro : st.box.n),
  Q: () => st.fl.Q, ratio: () => st.pv.ratio, Th: () => st.eng.Th, Tc: () => st.eng.Tc
};
const set = {
  T: (v) => { if (st.mode === "kinetic") st.kin.T = v; else if (st.mode === "speeds") st.speeds.T = v; else if (st.mode === "energy") st.energy.T = v; else if (st.mode === "laws") st.lawX[st.law] = v; else { st.box.T = v; st.box = settle(st.box); } },
  V: (v) => { if (st.mode === "kinetic") st.kin.V = v; else if (st.mode === "laws") st.lawX.boyle = v; else { st.box.V = v; st.box = settle(st.box); } },
  n: (v) => { if (st.mode === "kinetic") st.kin.n = v; else if (st.mode === "laws") st.lawX.avogadro = v; else { st.box.n = v; st.box = settle(st.box); } },
  Q: (v) => { st.fl.Q = v; }, ratio: (v) => { st.pv.ratio = v; }, Th: (v) => { st.eng.Th = v; }, Tc: (v) => { st.eng.Tc = v; }
};
const show = {
  T: (v) => `${kelvin(v)} (${celsius(v)})`, V: litres, n: (v) => `${sig(v)} mol`, Q: (v) => `${sig(v)} J`,
  ratio: (v) => `\u00d7 ${sig(v)}`, Th: kelvin, Tc: kelvin
};
function buildControls() {
  const host = $$("[data-sliders]")[0];
  host.innerHTML = "";
  for (const [k, text] of sliderList()) {
    const lab = document.createElement("label"); lab.className = "slider";
    const sp = document.createElement("span"); sp.textContent = text;
    const out = document.createElement("output"); out.dataset.out = k;
    const inp = document.createElement("input"); inp.type = "range"; inp.min = "0"; inp.max = "200"; inp.step = "1"; inp.dataset.slider = k;
    inp.setAttribute("aria-label", text);
    inp.addEventListener("input", () => { set[k](fromSlider(k, Number(inp.value))); sync(); });
    lab.append(sp, out, inp); host.appendChild(lab);
  }
  // gas chooser
  const gh = $$("[data-gases]")[0]; gh.innerHTML = "";
  gh.hidden = !["kinetic", "speeds", "firstlaw", "pv", "sandbox"].includes(st.mode);
  for (const id of GAS_IDS) {
    const b = document.createElement("button"); b.type = "button"; b.dataset.gas = id; b.textContent = GASES[id].formula;
    b.setAttribute("aria-label", GASES[id].name);
    b.addEventListener("click", () => { st.gas = id; st.box.path = []; sync(); });
    gh.appendChild(b);
  }
  const lh = $$("[data-laws]")[0]; lh.innerHTML = ""; lh.hidden = st.mode !== "laws";
  for (const id of LAW_IDS) {
    const b = document.createElement("button"); b.type = "button"; b.dataset.law = id; b.textContent = LAWS[id].name;
    b.addEventListener("click", () => { st.law = id; buildControls(); sync(); });
    lh.appendChild(b);
  }
  const ph = $$("[data-procs]")[0]; ph.innerHTML = "";
  const procs = st.mode === "firstlaw"
    ? [["proc", "isochoric", "Fixed volume"], ["proc", "isobaric", "Fixed pressure"], ["proc", "isothermal", "Fixed temperature"], ["sign", 1, "Heat in"], ["sign", -1, "Heat out"]]
    : st.mode === "pv" ? [["pproc", "isothermal", "Isothermal"], ["pproc", "adiabatic", "Adiabatic"], ["dir", -1, "Compress"], ["dir", 1, "Expand"]] : [];
  ph.hidden = !procs.length;
  for (const [kind, val, text] of procs) {
    const b = document.createElement("button"); b.type = "button"; b.dataset.kind = kind; b.dataset.val = String(val); b.textContent = text;
    b.addEventListener("click", () => {
      if (kind === "proc") st.fl.proc = val; else if (kind === "sign") st.fl.sign = val;
      else if (kind === "pproc") st.pv.proc = val; else st.pv.dir = val;
      sync();
    });
    ph.appendChild(b);
  }
  const sh = $$("[data-sources]")[0]; sh.innerHTML = ""; sh.hidden = st.mode !== "sandbox";
  for (const id of Object.keys(SOURCES)) {
    const b = document.createElement("button"); b.type = "button"; b.dataset.source = id; b.textContent = SOURCES[id].name;
    b.addEventListener("click", () => { st.box.source = id; sync(); });
    sh.appendChild(b);
  }
  $$("[data-piston]")[0].hidden = st.mode !== "sandbox";
  $$("[data-runrow]")[0].hidden = !["kinetic", "speeds", "energy", "engine", "sandbox"].includes(st.mode);
}
$$("[data-lock]")[0].addEventListener("click", () => { st.box.locked = !st.box.locked; st.box = settle(st.box); sync(); });
for (const b of $$("[data-weight]")) b.addEventListener("click", () => {
  if (st.box.weights.length >= MAX_WEIGHTS) return;
  st.box.weights.push(b.dataset.weight); updatePext(); sync();
});
$$("[data-unweight]")[0].addEventListener("click", () => { st.box.weights.pop(); updatePext(); sync(); });
function updatePext() { st.box.Pext = P_ATM + weightPressure(st.box.weights.map((w) => WEIGHTS[w])); st.box = settle(st.box); }
$$("[data-run]")[0].addEventListener("click", () => {
  if (st.mode === "engine") { if (reducedMotion) { st.eng.u = (Math.floor(st.eng.u) + 1) % 4; } else st.eng.running = !st.eng.running; }
  else st.running = !st.running;
  sync();
});
$$("[data-reset]")[0].addEventListener("click", () => {
  if (st.mode === "engine") st.eng.u = 0;
  else if (st.mode === "sandbox") { st.box = settle({ n: BASE.n, T: 300, V: BASE.V, locked: false, weights: [], source: "none", Pext: P_ATM, path: [] }); }
  partsKey = ""; sync();
});

// ---------- readouts ----------
const NOTES = {
  kinetic: "A gas is a crowd of molecules flying in straight lines and bouncing off the walls. Each bounce pushes on the wall; millions of pushes per second add up to pressure. Heat the gas and the molecules move faster, so they hit harder and more often. Shrink the volume or add molecules and the hits come more often. Motion is slowed down a lot, the box is flat, and each dot stands for about 1.2 \u00d7 10\u00b2\u00b9 molecules. The orange flashes are wall hits. With only a few dozen dots, the pressure worked out from their speeds differs from nRT/V by chance; real gases have so many molecules that the two agree.",
  laws: "The ideal gas law PV = nRT ties the four quantities together. Hold two fixed, change one, and watch the fourth follow. Temperatures must be in kelvin: the straight lines for Charles and Gay-Lussac point back to zero at 0 K (\u2212273.15 \u00b0C), absolute zero. Real gases follow these laws well at low pressure and well above the temperature where they turn liquid.",
  speeds: "Molecules in a gas do not all move at the same speed. The Maxwell-Boltzmann curve shows how many have each speed. Its peak is the most probable speed; the mean and the root-mean-square speed sit a little higher. Heating spreads the curve out and moves it to faster speeds, and the area under it stays 1. Lighter molecules move faster at the same temperature. The bars count the dots in the cylinder.",
  energy: "The cylinder holds a mix of helium (gold) and argon (purple) at one temperature. Argon atoms are 10 times heavier, so they move about 3.2 times slower, yet the average kinetic energy of each kind is the same: \u27e8KE\u27e9 = (3/2)kT. Temperature is a measure of the average kinetic energy of the molecules. Double the kelvin temperature and the average kinetic energy doubles.",
  firstlaw: "First law of thermodynamics: \u0394U = Q \u2212 W. Q is heat added to the gas and W is work done by the gas on the piston. At fixed volume nothing moves, so W = 0 and all the heat raises U and T. At fixed pressure the piston rises, so part of the heat leaves as work and T rises less. At fixed temperature (in a large water bath) U stays the same and all the heat becomes work. The gas starts at 300 K, 2 L and 0.08 mol.",
  pv: "On a PV diagram the work done by the gas is the area under the path. Isothermal: the gas stays at 300 K by trading heat with its surroundings, so PV stays constant. Adiabatic: the cylinder is insulated (Q = 0), so compressing it turns the work done on it into internal energy and it heats up; PV\u1d5e stays constant and the curve is steeper. Both start at 300 K and 2 L.",
  engine: "A Carnot engine runs helium through four steps: it takes in heat Q\u2095 from the hot side while it expands at T\u2095, expands further with no heat flow and cools to T\u1d9c, gives heat Q\u1d9c to the cold side while it is compressed at T\u1d9c, then is compressed with no heat flow back to T\u2095. The enclosed area is the net work W = Q\u2095 \u2212 Q\u1d9c. No engine working between the same two temperatures can beat the Carnot efficiency 1 \u2212 T\u1d9c/T\u2095.",
  sandbox: "Free play. Pick a heat source and watch the gas warm toward it or cool toward the ice. Lock the piston to hold the volume, or let it float and add weights to raise the pressure on it. The piston stops at 0.5 L and 4.5 L. The PV diagram traces where the gas has been."
};
function readout(cur) {
  const g = gasOf(), lines = [];
  const base = () => [`P = ${kPa(cur.P)}   V = ${litres(cur.V)}`, `T = ${kelvin(cur.T)}   n = ${sig(cur.n)} mol`];
  switch (st.mode) {
    case "kinetic": {
      const N = cur.n * NA, Pk = kineticPressure(N, moleculeMass(g), meanSquare(parts), cur.V);
      lines.push(...base(), `nRT/V = ${kPa(cur.P)}`, `From the dots, Nm\u27e8v\u00b2\u27e9/(3V) = ${kPa(Pk)}`, `Molecules N = nN\u2090 = ${sci(N)}`, `v_rms = \u221a(3kT/m) = ${sig(vRms(g, cur.T))} m/s`);
      break;
    }
    case "laws": {
      const L0 = LAWS[st.law];
      lines.push(...base(), `${L0.name}'s law: ${L0.rule}`);
      if (st.law === "boyle") lines.push(`PV = ${sig(cur.P * cur.V)} J (stays the same)`);
      if (st.law === "charles") lines.push(`V/T = ${sig(cur.V / L / cur.T)} L/K (stays the same)`);
      if (st.law === "gaylussac") lines.push(`P/T = ${sig(cur.P / 1000 / cur.T)} kPa/K (stays the same)`);
      if (st.law === "avogadro") lines.push(`V/n = ${sig(cur.V / L / cur.n)} L/mol (stays the same)`);
      break;
    }
    case "speeds": {
      const Tk = cur.T;
      lines.push(`${g.name}, M = ${g.M} g/mol, T = ${kelvin(Tk)}`, `Most probable v\u209a = \u221a(2kT/m) = ${sig(vProbable(g, Tk))} m/s`,
        `Mean \u27e8v\u27e9 = \u221a(8kT/\u03c0m) = ${sig(vMean(g, Tk))} m/s`, `RMS v_rms = \u221a(3kT/m) = ${sig(vRms(g, Tk))} m/s`,
        `Faster than 1000 m/s: ${sig(100 * mbFractionAbove(g, Tk, 1000), 2)}%`);
      break;
    }
    case "energy": {
      const ke = meanKE(cur.T);
      lines.push(`T = ${kelvin(cur.T)}`, `\u27e8KE\u27e9 = (3/2)kT = ${sci(ke)} J`);
      for (const id of ["he", "ar"]) {
        const ps = parts.filter((p) => p.gas === id), m = moleculeMass(GASES[id]);
        lines.push(`${GASES[id].name}: v_rms ${sig(vRms(GASES[id], cur.T))} m/s, dots' \u00bdm\u27e8v\u00b2\u27e9 = ${sci(0.5 * m * meanSquare(ps))} J`);
      }
      break;
    }
    case "firstlaw": {
      const r = cur.r;
      lines.push(`${g.name}: C\u1d65 = ${sig(cv(g))} J/(mol\u00b7K), C\u209a = ${sig(cp(g))} J/(mol\u00b7K)`,
        `Q = ${fmtSigned(r.Q, "J")}   W = ${fmtSigned(r.W, "J")}   \u0394U = ${fmtSigned(r.dU, "J")}`,
        `T: 300 K \u2192 ${kelvin(r.T2)}   V: 2 L \u2192 ${litres(r.V2)}`, `P: ${kPa(r.P1)} \u2192 ${kPa(r.P2)}`);
      break;
    }
    case "pv": {
      const r = cur.r;
      lines.push(`${g.name}, \u03b3 = C\u209a/C\u1d65 = ${sig(gamma(g))}`, `V: 2 L \u2192 ${litres(r.V2)}   T: 300 K \u2192 ${kelvin(r.T2)}`,
        `P: ${kPa(r.P1)} \u2192 ${kPa(r.P2)}`, `Work by gas W = ${fmtSigned(r.W, "J")}`, `Q = ${fmtSigned(r.Q, "J")}   \u0394U = ${fmtSigned(r.dU, "J")}`);
      break;
    }
    case "engine": {
      const c = cur.c, steps = ["taking in heat at T\u2095", "expanding, no heat flow", "giving out heat at T\u1d9c", "compressed, no heat flow"];
      lines.push(`Now: ${steps[cur.s.leg]}   T = ${kelvin(cur.T)}`, `Q\u2095 = ${sig(c.Qh)} J   Q\u1d9c = ${sig(c.Qc)} J`, `W = Q\u2095 \u2212 Q\u1d9c = ${sig(c.W)} J per cycle`,
        `Efficiency W/Q\u2095 = ${sig(100 * c.eff)}%`, `Carnot limit 1 \u2212 T\u1d9c/T\u2095 = ${sig(100 * c.carnot)}%`);
      break;
    }
    default: {
      const b = st.box;
      lines.push(...base(), `Outside pressure on the piston: ${kPa(b.Pext)}${b.locked ? " (piston locked)" : ""}`,
        `U = (f/2)nRT = ${sig(internalEnergy(g, b.n, b.T))} J   \u27e8KE\u27e9 = ${sci(meanKE(b.T))} J`,
        b.source === "none" ? "Insulated: no heat flows" : `Heat flows toward ${kelvin(SOURCES[b.source].Ts)}`);
      if (!b.locked && (b.V <= V_MIN * 1.0001 || b.V >= V_MAX * 0.9999)) lines.push("The piston is resting on a stop.");
    }
  }
  return lines.join("\n");
}

// ---------- sync ----------
const TITLES = { kinetic: "Molecules in a box", laws: "Ideal gas law", speeds: "Maxwell-Boltzmann speeds", energy: "Kinetic energy and temperature",
  firstlaw: "Heat, work and the first law", pv: "Isothermal and adiabatic", engine: "Carnot heat engine", sandbox: "Sandbox" };
function setMode(m) {
  st.mode = m;
  for (const b of $$(".toolbar .tool")) b.setAttribute("aria-pressed", String(b.dataset.show === m));
  buildControls(); sync();
}
for (const b of $$(".toolbar .tool")) b.addEventListener("click", () => setMode(b.dataset.show));
function writeUrl() {
  const p = new URLSearchParams(location.search);
  p.set("mode", st.mode);
  if (st.mode === "laws") p.set("law", st.law); else p.delete("law");
  if (["kinetic", "speeds", "firstlaw", "pv", "sandbox"].includes(st.mode)) p.set("gas", st.gas); else p.delete("gas");
  history.replaceState(null, "", "?" + p.toString());
}
function sync() {
  const cur = current();
  syncParticles(cur);
  $("panelTitle").textContent = TITLES[st.mode];
  for (const el of $$("[data-slider]")) {
    const k = el.dataset.slider, v = get[k]();
    el.value = String(toSlider(k, v));
    const out = $$(`[data-out="${k}"]`)[0]; if (out) out.textContent = show[k](v);
    el.disabled = st.mode === "sandbox" && k === "V" && !st.box.locked;
  }
  for (const b of $$("[data-gas]")) b.setAttribute("aria-pressed", String(b.dataset.gas === st.gas));
  for (const b of $$("[data-law]")) b.setAttribute("aria-pressed", String(b.dataset.law === st.law));
  for (const b of $$("[data-kind]")) {
    const k = b.dataset.kind, v = b.dataset.val;
    const on = k === "proc" ? st.fl.proc === v : k === "sign" ? String(st.fl.sign) === v : k === "pproc" ? st.pv.proc === v : String(st.pv.dir) === v;
    b.setAttribute("aria-pressed", String(on));
  }
  for (const b of $$("[data-source]")) b.setAttribute("aria-pressed", String(b.dataset.source === st.box.source));
  $$("[data-lock]")[0].setAttribute("aria-pressed", String(st.box.locked));
  for (const b of $$("[data-weight]")) b.disabled = st.box.weights.length >= MAX_WEIGHTS;
  $$("[data-unweight]")[0].disabled = !st.box.weights.length;
  const runBtn = $$("[data-run]")[0];
  runBtn.textContent = st.mode === "engine" ? (reducedMotion ? "Next step" : st.eng.running ? "Pause" : "Run") : (st.running && !reducedMotion ? "Pause" : "Run");
  runBtn.disabled = reducedMotion && st.mode !== "engine";
  $("readout").textContent = readout(cur);
  $("note").textContent = NOTES[st.mode] + (reducedMotion ? " Reduced motion is on, so the molecules are shown still." : "");
  writeUrl();
  dirty = true;
}

// ---------- draw ----------
const sc = $("scene"), sctx = sc.getContext("2d"), gc = $("graph"), gctx = gc.getContext("2d");
const dpr = Math.min(2, window.devicePixelRatio || 1);
const size = { sw: 0, sh: 0, gw: 0, gh: 0 };
function resize() {
  const a = sc.getBoundingClientRect(), b = gc.getBoundingClientRect();
  const sw = Math.max(1, Math.round(a.width)), sh = Math.max(1, Math.round(a.height)), gw = Math.max(1, Math.round(b.width)), gh = Math.max(1, Math.round(b.height));
  if (sw !== size.sw || sh !== size.sh) { size.sw = sw; size.sh = sh; sc.width = Math.round(sw * dpr); sc.height = Math.round(sh * dpr); dirty = true; }
  if (gw !== size.gw || gh !== size.gh) { size.gw = gw; size.gh = gh; gc.width = Math.round(gw * dpr); gc.height = Math.round(gh * dpr); dirty = true; }
}
let flicker = 0;
function draw() {
  const cur = current();
  sctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  sctx.fillStyle = T.paper; sctx.fillRect(0, 0, size.sw, size.sh);
  const V = sceneView(size.sw, size.sh, st.mode === "sandbox" ? -330 : -110);
  drawApparatus(sctx, V, T, img, {
    ...cur, parts, gases: GASES, flashes, flicker, gaugeFull: st.mode === "sandbox" || st.mode === "kinetic" ? 800e3 : 400e3
  });
  gctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  drawGraph(gctx, size.gw, size.gh, cur);
}
const kPaFmt = (v) => String(Math.round(v / 1000));
const LFmt = (v) => String(+(v / L).toFixed(1));
function pvAxes(ctx, w, h, Pmax) {
  const step = Pmax > 500e3 ? 200e3 : 100e3;
  const yt = []; for (let p = 0; p <= Pmax + 1; p += step) yt.push(p);
  return axes(ctx, w, h, T, { xmin: 0, xmax: 4.6 * L, ymin: 0, ymax: Pmax, xticks: [0, 1, 2, 3, 4].map((v) => v * L), yticks: yt, xfmt: LFmt, yfmt: kPaFmt, xlabel: "Volume V (L)", ylabel: "Pressure P (kPa)" });
}
function drawGraph(ctx, w, h, cur) {
  const g = gasOf();
  if (st.mode === "kinetic") {
    const Pk = kineticPressure(cur.n * NA, moleculeMass(g), meanSquare(parts), cur.V);
    bars(ctx, w, h, T, [{ label: "nRT/V", value: cur.P / 1000, color: T.iso }, { label: "From the dots", value: Pk / 1000, color: T.accent }], "kPa", { min: 0, max: 900 });
    ctx.fillStyle = T.ink; ctx.font = "13px system-ui, sans-serif"; ctx.textAlign = "left"; ctx.textBaseline = "top";
    ctx.fillText("Pressure two ways (kPa)", 10, 8);
  } else if (st.mode === "laws") {
    const lw = st.law;
    if (lw === "boyle") {
      const G = pvAxes(ctx, w, h, 400e3);
      line(ctx, G, isothermCurve(BASE.n, BASE.T, 0.8 * L, 4.5 * L).map((p) => [p.V, p.P]), T.iso, 2.5);
      dot(ctx, G, cur.V, cur.P, T.accent); label(ctx, G, cur.V, cur.P, "now", T.ink);
    } else {
      const isV = lw !== "gaylussac", xmax = lw === "avogadro" ? 0.18 : 620;
      const ymax = lw === "charles" ? 4.5 * L : lw === "avogadro" ? 4.5 * L : 220e3;
      const G = axes(ctx, w, h, T, {
        xmin: 0, xmax, ymin: 0, ymax,
        xticks: lw === "avogadro" ? [0, 0.04, 0.08, 0.12, 0.16] : [0, 100, 200, 300, 400, 500, 600],
        yticks: isV ? [0, 1, 2, 3, 4].map((v) => v * L) : [0, 50e3, 100e3, 150e3, 200e3],
        yfmt: isV ? LFmt : kPaFmt, xlabel: lw === "avogadro" ? "Amount n (mol)" : "Temperature T (K)", ylabel: isV ? "Volume V (L)" : "Pressure P (kPa)"
      });
      const f = (x) => (lw === "charles" ? volume(BASE.n, x, P_BASE) : lw === "avogadro" ? volume(x, BASE.T, P_BASE) : pressure(BASE.n, x, BASE.V));
      const lo = lw === "avogadro" ? 0.02 : 150, hi = lw === "avogadro" ? 0.16 : 600;
      line(ctx, G, [[0, 0], [lo, f(lo)]], T.dim, 1.5, [5, 5]);
      line(ctx, G, [[lo, f(lo)], [hi, f(hi)]], T.iso, 2.5);
      const x = st.lawX[lw], y = isV ? cur.V : cur.P;
      dot(ctx, G, x, y, T.accent); label(ctx, G, x, y, "now", T.ink);
      if (lw !== "avogadro") label(ctx, G, 0, 0, "0 K", T.ink, "left", 6, -14);
    }
  } else if (st.mode === "speeds") {
    const Tk = cur.T, vmax = Math.max(4 * vProbable(g, 600), 400);
    const peak = mbPdf(g, 150, vProbable(g, 150));
    const step = vmax > 3000 ? 1000 : vmax > 1500 ? 500 : 250, xt = []; for (let v = 0; v <= vmax; v += step) xt.push(v);
    const G = axes(ctx, w, h, T, { xmin: 0, xmax: vmax, ymin: 0, ymax: peak * 1.3, xticks: xt, yticks: [], xlabel: "Speed v (m/s)", ylabel: "Fraction of molecules per m/s" });
    // dots histogram, scaled to the same area as the curve
    const nb = 16, bw = vmax / nb, counts = new Array(nb).fill(0);
    for (const p of parts) { const i = Math.floor(speedOf(p) / bw); if (i < nb) counts[i]++; }
    ctx.fillStyle = T.grid;
    counts.forEach((c, i) => { const hgt = c / parts.length / bw; ctx.fillRect(G.X(i * bw) + 1, G.Y(hgt), G.X(bw) - G.X(0) - 2, G.Y(0) - G.Y(hgt)); });
    const curve = (TT) => { const pts = []; for (let i = 0; i <= 120; i++) { const v = vmax * i / 120; pts.push([v, mbPdf(g, TT, v)]); } return pts; };
    line(ctx, G, curve(300), T.dim, 1.5, [5, 5]);
    line(ctx, G, curve(Tk), T.hot, 2.5);
    const marks = [[vProbable(g, Tk), "v\u209a"], [vMean(g, Tk), "\u27e8v\u27e9"], [vRms(g, Tk), "v_rms"]];
    const top = mbPdf(g, Tk, vProbable(g, Tk));
    marks.forEach(([v, t], i) => {
      line(ctx, G, [[v, 0], [v, top * (1.04 + 0.1 * i)]], T.ink, 1);
      label(ctx, G, v, top * (1.04 + 0.1 * i), t, T.ink, "left", 4, -2);
    });
    legend(ctx, w, T, [{ text: `${sig(Tk)} K`, color: T.hot }, { text: "300 K", color: T.dim, dash: [5, 5] }]);
  } else if (st.mode === "energy") {
    const G = axes(ctx, w, h, T, { xmin: 0, xmax: 620, ymin: 0, ymax: 1.4e-20, xticks: [0, 100, 200, 300, 400, 500, 600], yticks: [0, 0.4e-20, 0.8e-20, 1.2e-20], yfmt: (v) => (v * 1e21).toFixed(0), xlabel: "Temperature T (K)", ylabel: "Average KE (10\u207b\u00b2\u00b9 J)" });
    line(ctx, G, [[0, 0], [620, meanKE(620)]], T.iso, 2.5);
    dot(ctx, G, cur.T, meanKE(cur.T), T.accent);
    for (const id of ["he", "ar"]) {
      const ps = parts.filter((p) => p.gas === id), ke = 0.5 * moleculeMass(GASES[id]) * meanSquare(ps);
      dot(ctx, G, cur.T, ke, GAS_COLORS[id], 4);
    }
    label(ctx, G, 600, meanKE(600), "(3/2)kT", T.ink, "right", -4, -14);
  } else if (st.mode === "firstlaw") {
    const r = cur.r;
    bars(ctx, w, h, T, [{ label: "Heat in Q", value: r.Q, color: T.hot }, { label: "Work by gas W", value: r.W, color: T.work }, { label: "\u0394U", value: r.dU, color: T.iso }], "J", { min: -160, max: 160 });
  } else if (st.mode === "pv") {
    const G = pvAxes(ctx, w, h, 400e3), r = cur.r;
    line(ctx, G, isothermCurve(BASE.n, BASE.T, 0.9 * L, 4.4 * L).map((p) => [p.V, p.P]), T.iso, 2, st.pv.proc === "isothermal" ? null : [6, 5]);
    line(ctx, G, adiabatCurve(GASES[st.gas], BASE.n, BASE.T, BASE.V, 0.9 * L, 4.4 * L).map((p) => [p.V, p.P]), T.adia, 2, st.pv.proc === "adiabatic" ? null : [6, 5]);
    // shade the work: area under the chosen path
    const path = st.pv.proc === "isothermal" ? isothermCurve(BASE.n, BASE.T, BASE.V, r.V2, 40) : adiabatCurve(GASES[st.gas], BASE.n, BASE.T, BASE.V, BASE.V, r.V2, 40);
    ctx.fillStyle = T.work; ctx.globalAlpha = 0.22; ctx.beginPath(); ctx.moveTo(G.X(BASE.V), G.Y(0));
    for (const p of path) ctx.lineTo(G.X(p.V), G.Y(p.P));
    ctx.lineTo(G.X(r.V2), G.Y(0)); ctx.closePath(); ctx.fill(); ctx.globalAlpha = 1;
    dot(ctx, G, BASE.V, r.P1, T.dim, 5); label(ctx, G, BASE.V, r.P1, "start", T.ink);
    dot(ctx, G, r.V2, r.P2, T.accent); label(ctx, G, r.V2, r.P2, "end", T.ink);
    legend(ctx, w, T, [{ text: "Isothermal", color: T.iso }, { text: "Adiabatic", color: T.adia }]);
  } else if (st.mode === "engine") {
    const c = cur.c, G = pvAxes(ctx, w, h, 400e3), gHe = GASES.he;
    const legs = [isothermCurve(BASE.n, c.A.T, c.A.V, c.B.V), adiabatCurve(gHe, BASE.n, c.B.T, c.B.V, c.B.V, c.C.V), isothermCurve(BASE.n, c.C.T, c.C.V, c.D.V), adiabatCurve(gHe, BASE.n, c.D.T, c.D.V, c.D.V, c.A.V)];
    ctx.fillStyle = T.work; ctx.globalAlpha = 0.2; ctx.beginPath();
    legs.flat().forEach((p, i) => (i ? ctx.lineTo(G.X(p.V), G.Y(p.P)) : ctx.moveTo(G.X(p.V), G.Y(p.P)))); ctx.closePath(); ctx.fill(); ctx.globalAlpha = 1;
    legs.forEach((pts, i) => line(ctx, G, pts.map((p) => [p.V, p.P]), i === 0 ? T.hot : i === 2 ? T.cold : T.ink, 2.5));
    for (const [k, p] of Object.entries({ A: c.A, B: c.B, C: c.C, D: c.D })) label(ctx, G, p.V, p.P, k, T.ink, "left", 6, -10);
    dot(ctx, G, cur.V, cur.P, T.accent);
    legend(ctx, w, T, [{ text: "at T\u2095", color: T.hot }, { text: "at T\u1d9c", color: T.cold }]);
  } else {
    const G = pvAxes(ctx, w, h, 800e3), b = st.box;
    if (b.path.length > 1) line(ctx, G, b.path.map((p) => [p.V, p.P]), T.dim, 1.5);
    dot(ctx, G, b.V, b.P, T.accent);
  }
}

// ---------- animation ----------
let last = performance.now(), readTick = 0;
function frame(now) {
  const dt = Math.min(0.05, (now - last) / 1000); last = now;
  if (!document.hidden && !reducedMotion) {
    const cur = current();
    if (st.running && st.mode !== "laws" && st.mode !== "firstlaw" && st.mode !== "pv") {
      const hits = stepParticles(parts, boxOf(cur.V), dt, 7);
      if (st.mode === "kinetic") for (const e of hits.events.slice(0, 6)) flashes.push({ ...e, life: 1 });
      dirty = true;
    } else if (st.running) { stepParticles(parts, boxOf(cur.V), dt, 7); dirty = true; }
    for (const f of flashes) f.life -= dt * 3;
    flashes = flashes.filter((f) => f.life > 0).slice(-60);
    flicker = Math.sin(now / 90) * 0.5 + Math.sin(now / 37) * 0.5;
    if (st.mode === "engine" && st.eng.running) { st.eng.u = (st.eng.u + dt / 2.5) % 4; dirty = true; }
    if (st.mode === "sandbox" && st.running) {
      const g = GASES[st.gas], before = st.box.T;
      st.box = sandboxStep(g, st.box, st.box.source, dt);
      if (Math.abs(st.box.T - before) > 1e-6) dirty = true;
      const lp = st.box.path[st.box.path.length - 1];
      if (!lp || Math.abs(lp.V - st.box.V) > 1e-6 || Math.abs(lp.P - st.box.P) > 50) { st.box.path.push({ V: st.box.V, P: st.box.P }); if (st.box.path.length > 2000) st.box.path.shift(); }
    }
    if (now - readTick > 250 && st.mode !== "laws" && st.mode !== "firstlaw" && st.mode !== "pv") { readTick = now; sync(); }
  }
  if (dirty) { dirty = false; resize(); draw(); }
  requestAnimationFrame(frame);
}

$("studyBackBtn").addEventListener("click", (e) => {
  e.preventDefault();
  // Back to the Study library with the board return keys only: drop this
  // module's mode, law and gas from the URL, then hand over the query.
  const qs = forwardStudyQuery(location.search).toString();
  history.replaceState(null, "", qs ? "?" + qs : location.pathname);
  location.href = "study.html" + location.search;
});

window.addEventListener("resize", () => { resize(); dirty = true; });
new ResizeObserver(() => { resize(); dirty = true; }).observe(sc);
setMode(MODES.includes(st.mode) ? st.mode : "kinetic");
requestAnimationFrame(frame);
// Read-only hook for the browser checks.
window.__gasthermo = { state: st, parts: () => parts };
