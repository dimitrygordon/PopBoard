// Planetary Climate: page wiring and the scenes for each mode.
// Physics and data: climate-physics.js. Drawing helpers: climate-render.js.

import { forwardStudyQuery } from "../board-return.js?v=20261022a";
import { loadImages, readTokens, text, line, arrow, sprite, tinted, sun, molecule, planet, cloud, ground, thermometer, bar } from "./climate-render.js";
import {
  SIGMA, S0, PLANETS, PLANET_IDS, eqTemp, emitted, peakUm, oneLayer, epsFor, layersFor, GASES, GAS_IDS, WINDOW_UM, C0, F2X, F2X_AR6, ECS,
  KEELING, FEEDBACKS, AR6_NET, feedbackSum, EARTH_TE, solarAt, waterState, T_FREEZE, T_BOIL,
  SLIDERS, SLIDER_KEY, fromSlider, toSlider, modeSliders, shown, MODES, parseQuery, sig, fix, degC
} from "./climate-physics.js";

const $ = (id) => document.getElementById(id);
const $$ = (sel, root = document) => [...root.querySelectorAll(sel)];
const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
const THEME_KEY = "popboard.climate.theme";
let T = readTokens();
const q = parseQuery(location.search);
let dirty = true;
const img = loadImages(() => { dirty = true; });

const E = PLANETS.earth;
const EARTH_EPS = epsFor(EARTH_TE, E.Tobs);
const preset = (id) => { const p = PLANETS[id]; return { dAU: p.d, albedo: p.albedo, layers: layersFor(eqTemp(solarAt(p.d), p.albedo), p.Tobs) }; };
const st = {
  mode: q.mode,
  energy: { S: E.S, albedo: E.albedo, body: "earth" },
  greenhouse: { eps: EARTH_EPS, gas: "co2" },
  compare: { planet: "venus" },
  co2: { ppm: 425 },
  feedbacks: { dF: F2X_AR6, on: { wvlr: true, albedo: true, cloud: true } },
  sandbox: { look: "earth", atmosphere: true, ...preset("earth") }
};

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

// ---------- controls ----------
const LABELS = { S: "Sunlight S", albedo: "Albedo a", eps: "Infrared absorbed by the layer, \u03b5", ppm: "CO\u2082 concentration C",
  dF: "Radiative forcing \u0394F", dAU: "Distance from the Sun", layers: "Greenhouse thickness (opaque layers)" };
const fmtSlider = {
  S: (v) => Math.round(v) + " W/m\u00b2", albedo: (v) => v.toFixed(Math.abs(v * 100 - Math.round(v * 100)) > 1e-6 ? 3 : 2), eps: (v) => v.toFixed(2), ppm: (v) => Math.round(v) + " ppm",
  dF: (v) => v.toFixed(2) + " W/m\u00b2", dAU: (v) => sig(v, 3) + " AU", layers: (v) => sig(v, 2)
};
const cur = () => st[st.mode];
function button(host, label, onClick) {
  const b = document.createElement("button"); b.type = "button"; b.textContent = label;
  b.addEventListener("click", onClick); host.appendChild(b); return b;
}
function buildControls() {
  const host = $$("[data-sliders]")[0];
  host.innerHTML = "";
  for (const k of modeSliders(st.mode, cur())) {
    const lab = document.createElement("label"); lab.className = "slider";
    const sp = document.createElement("span"); sp.textContent = LABELS[k];
    const out = document.createElement("output"); out.dataset.out = k;
    const inp = document.createElement("input"); inp.type = "range"; inp.min = "0"; inp.max = String(SLIDERS[k].steps); inp.step = "1"; inp.dataset.slider = k;
    inp.setAttribute("aria-label", LABELS[k]);
    inp.addEventListener("input", () => { cur()[SLIDER_KEY[k]] = fromSlider(k, Number(inp.value)); sync(); });
    lab.append(sp, out, inp); host.appendChild(lab);
  }
  const rows = $$("[data-choices]")[0];
  rows.innerHTML = "";
  const group = (label, items, isOn, pick) => {
    const g = document.createElement("div"); g.className = "group";
    const h = document.createElement("p"); h.className = "group-label"; h.textContent = label; g.appendChild(h);
    const r = document.createElement("div"); r.className = "row"; r.setAttribute("role", "group"); r.setAttribute("aria-label", label);
    for (const [val, t] of items) { const b = button(r, t, () => { pick(val); sync(); }); b.dataset.choice = label; b._on = () => isOn(val); }
    g.appendChild(r); rows.appendChild(g);
  };
  const s = cur(), planets = PLANET_IDS.map((id) => [id, PLANETS[id].name]);
  if (st.mode === "energy") group("Use a real planet's sunlight and albedo", planets, (v) => s.body === v && s.S === PLANETS[v].S && s.albedo === PLANETS[v].albedo,
    (v) => { s.body = v; s.S = PLANETS[v].S; s.albedo = PLANETS[v].albedo; });
  else if (st.mode === "greenhouse") {
    group("Look at a gas", GAS_IDS.map((id) => [id, GASES[id].formula]), (v) => s.gas === v, (v) => { s.gas = v; });
    group("Preset", [["earth", "Match Earth (288 K)"]], () => Math.abs(s.eps - EARTH_EPS) < 1e-9, () => { s.eps = EARTH_EPS; });
  } else if (st.mode === "compare") group("Planet", planets, (v) => s.planet === v, (v) => { s.planet = v; });
  else if (st.mode === "co2") group("Jump to", [[316, "1959"], [427, "2025"], [560, "2 \u00d7 pre-industrial"], [1120, "4 \u00d7"]], (v) => Math.round(s.ppm) === v, (v) => { s.ppm = v; });
  else if (st.mode === "feedbacks") {
    for (const k of ["wvlr", "albedo", "cloud"]) group(FEEDBACKS[k].name, [[true, "On"], [false, "Off"]], (v) => s.on[k] === v, (v) => { s.on[k] = v; });
    group("Forcing", [[F2X_AR6, "Doubled CO\u2082 (3.93 W/m\u00b2)"]], (v) => s.dF === v, (v) => { s.dF = v; });
  } else if (st.mode === "sandbox") {
    group("Start from", planets, (v) => s.look === v && s.dAU === PLANETS[v].d, (v) => { Object.assign(s, preset(v), { look: v, atmosphere: true }); buildControls(); });
    group("Planet look", planets, (v) => s.look === v, (v) => { s.look = v; });
    group("Atmosphere", [[true, "Greenhouse on"], [false, "No atmosphere"]], (v) => s.atmosphere === v, (v) => { s.atmosphere = v; buildControls(); });
  }
}

// ---------- readouts ----------
const TITLES = { energy: "Energy balance", greenhouse: "Greenhouse effect", compare: "Venus, Earth and Mars", co2: "Carbon dioxide and warming",
  feedbacks: "Feedbacks", sandbox: "Sandbox: build a planet" };
const NOTES = {
  energy: "A planet warms until it gives off as much energy as it absorbs. Sunlight S arrives on a disc (area \u03c0R\u00b2) but the planet radiates from its whole sphere (area 4\u03c0R\u00b2), so on average each square meter absorbs S(1 \u2212 a)/4. The albedo a is the fraction of sunlight reflected straight back to space. Setting the absorbed sunlight equal to the infrared glow \u03c3T\u2074 gives the equilibrium temperature. For Earth that is about 255 K (\u221218 \u00b0C), but the real average surface is about 288 K (15 \u00b0C). The 33 K difference is the greenhouse effect.",
  greenhouse: "Sunlight is mostly visible light and passes through the air. The ground warms and glows in the infrared, peaking near 10 \u00b5m. Gases like CO\u2082, H\u2082O and CH\u2084, whose molecules have three or more atoms and can bend and stretch, absorb infrared at certain wavelengths, then re-emit it in all directions, so some comes back down. N\u2082 and O\u2082 make up 99% of dry air but barely absorb infrared. In this one-layer model the layer absorbs a fraction \u03b5 of the ground's infrared. The surface warms until the energy leaving the top again equals the sunlight absorbed. Real air is not one layer, so \u03b5 here is a stand-in for all greenhouse gases and clouds together.",
  compare: "All three rocky planets get their energy from the same Sun. Venus is closer, but its bright clouds reflect 77% of sunlight, so without a greenhouse effect it would be colder than Earth. Its thick CO\u2082 atmosphere (92 bar at the surface, about 90 times Earth's) traps so much infrared that its surface is about 737 K, hotter than Mercury. Mars also has a mostly CO\u2082 atmosphere, but it is so thin (under 1% of Earth's pressure) that it warms the surface by only a few kelvin.",
  co2: "Each extra bit of CO\u2082 adds a little less warming than the last, because the middle of its 15 \u00b5m band already absorbs almost all the infrared there, so extra CO\u2082 mostly works at the edges of the band: the radiative forcing grows with the logarithm of the concentration. Every doubling adds about the same forcing. The equilibrium climate sensitivity is the eventual warming for doubled CO\u2082. The IPCC (AR6, 2021) gives a best estimate of 3 \u00b0C, likely 2.5 to 4 \u00b0C, very likely 2 to 5 \u00b0C. These are long-run warmings from CO\u2082 alone, ignoring other gases, aerosols and the decades the oceans take to warm. Measured at Mauna Loa, CO\u2082 rose from 316 ppm in 1959 to 427 ppm in 2025.",
  feedbacks: "A forcing warms the planet, and the warming changes the planet in ways that change the warming. A warmer planet glows more (the Planck response), which pulls it back toward balance. Warmer air holds more water vapor, itself a greenhouse gas (about 7% more per \u00b0C). Melting snow and ice expose darker land and ocean, so the planet absorbs more sunlight (ice-albedo). Clouds change too. The warming is \u0394T = \u2212\u0394F / \u03bb, where \u03bb is the sum of the feedback parameters. Positive feedbacks make \u03bb less negative, so the same forcing warms more. Numbers are the IPCC AR6 central estimates (AR6's total is \u22121.16 because it also includes a tiny \u22120.01 from plants and soils).",
  sandbox: "Free play. Move your planet closer to or farther from the Sun, make it brighter or darker, and give it a thin or thick greenhouse atmosphere. The thickness counts how many fully infrared-absorbing layers the atmosphere acts like: each one adds another copy of the outgoing energy to the surface balance, so T\u209b = T\u2091 (1 + n)^\u00bc. Earth acts like about 0.6 layers, Venus like about 110. Ice caps grow when the surface is below freezing, and clouds form when liquid water is possible."
};
const K = (v) => fix(v, 0) + " K";
const W = (v) => sig(v, 3) + " W/m\u00b2";
function readout() {
  const m = st.mode, s = cur(), v = shown(m, s);
  if (m === "energy") return [`Sunlight S = ${Math.round(v.S)} W/m\u00b2, albedo a = ${fmtSlider.albedo(v.albedo)}`,
    `Absorbed S(1 \u2212 a)/4 = ${W(v.absorbed)}`, `Reflected Sa/4 = ${W(v.reflected)}`,
    `T = [S(1 \u2212 a)/(4\u03c3)]^\u00bc = ${K(v.T)} (${degC(v.T)})`, `\u03c3 = 5.67 \u00d7 10\u207b\u2078 W/(m\u00b2\u00b7K\u2074)`].join("\n");
  if (m === "greenhouse") {
    const g = GASES[s.gas];
    return [`No greenhouse: T\u2091 = ${K(v.Te)} (${degC(v.Te)})`, `Layer absorbs \u03b5 = ${v.eps.toFixed(2)} of the ground's infrared`,
      `Surface T\u209b = T\u2091 [2/(2 \u2212 \u03b5)]^\u00bc = ${K(v.Ts)} (${degC(v.Ts)})`, `Layer temperature T\u2090 = T\u209b / 2^\u00bc = ${K(v.Ta)}`,
      `Ground glows ${W(v.surfUp)}; ${W(v.passes)} escapes straight to space`, `Layer sends ${W(v.atmEach)} up and the same back down`,
      g.absorbs ? `${g.name} (${g.formula}) absorbs near ${g.bands.join(" and ")} \u00b5m` : `${g.name}: two identical atoms, almost no infrared absorption`].join("\n");
  }
  if (m === "compare") {
    const p = PLANETS[s.planet];
    return [`${p.name}: ${p.d.toFixed(3)} AU from the Sun, S = ${sig(p.S, 5)} W/m\u00b2`, `Bond albedo a = ${p.albedo}`,
      `Equilibrium T\u2091 = ${K(v.Te)} (${degC(v.Te)})`, `Observed surface average ${K(v.Tobs)} (${degC(v.Tobs)})`,
      `Greenhouse warming \u2248 ${K(v.warming)}`, `Surface pressure ${p.pBar < 0.1 ? p.pBar * 1000 + " mbar" : p.pBar + " bar"}, CO\u2082 ${p.co2}`].join("\n");
  }
  if (m === "co2") return [`C = ${Math.round(v.ppm)} ppm = ${v.ratio.toFixed(2)} \u00d7 pre-industrial (${C0} ppm)`,
    `\u0394F = 5.35 ln(C/C\u2080) = ${v.F.toFixed(2)} W/m\u00b2`, `Doubling: 5.35 ln 2 = ${F2X.toFixed(2)} W/m\u00b2`,
    `Eventual warming \u0394T = ECS \u00d7 \u0394F / ${F2X.toFixed(2)} W/m\u00b2:`, `  likely ${v.low.toFixed(1)} to ${v.high.toFixed(1)} \u00b0C, best ${v.best.toFixed(1)} \u00b0C`,
    `(ECS = equilibrium climate sensitivity, ${ECS.low} to ${ECS.high} \u00b0C, best ${ECS.best} \u00b0C)`].join("\n");
  if (m === "feedbacks") {
    const out = [`Forcing \u0394F = ${v.dF.toFixed(2)} W/m\u00b2`, `Planck response ${FEEDBACKS.planck.value.toFixed(2)} W/(m\u00b2\u00b7K)`];
    for (const k of ["wvlr", "albedo", "cloud"]) if (s.on[k]) out.push(`+ ${FEEDBACKS[k].name.toLowerCase()} +${FEEDBACKS[k].value.toFixed(2)}`);
    out.push(`\u03bb = ${v.lam.toFixed(2)} W/(m\u00b2\u00b7K)`, `\u0394T = \u2212\u0394F/\u03bb = ${v.dT.toFixed(2)} K`, `Planck response alone: ${v.dT0.toFixed(2)} K`, `Feedbacks multiply the warming by ${v.gain.toFixed(2)}`);
    return out.join("\n");
  }
  const ws = waterState(v.Ts);
  return [`Distance ${sig(v.dAU, 3)} AU: S = ${S0} / d\u00b2 = ${Math.round(v.S)} W/m\u00b2`, `Albedo a = ${fmtSlider.albedo(v.albedo)}`,
    `No greenhouse: T\u2091 = ${K(v.Te)} (${degC(v.Te)})`,
    s.atmosphere ? `Surface T\u209b = T\u2091 (1 + n)^\u00bc = ${K(v.Ts)} (${degC(v.Ts)})` : `No atmosphere: surface T = ${K(v.Ts)}`,
    ws === "ice" ? "Water would freeze (below 273 K)." : ws === "liquid" ? "Liquid water is possible (273 to 373 K at 1 atm)." : "Water would boil away (above 373 K at 1 atm)."].join("\n");
}

function setMode(m) {
  st.mode = m;
  for (const b of $$(".toolbar .tool")) b.setAttribute("aria-pressed", String(b.dataset.show === m));
  buildControls(); sync();
}
function writeUrl() {
  const p = new URLSearchParams(location.search);
  p.set("mode", st.mode);
  history.replaceState(null, "", "?" + p.toString());
}
for (const b of $$(".toolbar .tool")) b.addEventListener("click", () => setMode(b.dataset.show));
function sync() {
  const s = cur();
  $("panelTitle").textContent = TITLES[st.mode];
  for (const el of $$("[data-slider]")) {
    const k = el.dataset.slider, v = s[SLIDER_KEY[k]];
    el.value = String(toSlider(k, v));
    const out = $$(`[data-out="${k}"]`)[0]; if (out) out.textContent = fmtSlider[k](v);
  }
  for (const b of $$("[data-choice]")) if (b._on) b.setAttribute("aria-pressed", String(b._on()));
  const r = readout();
  $("readout").textContent = r;
  $("note").textContent = NOTES[st.mode];
  sc.setAttribute("aria-label", TITLES[st.mode] + ". " + r.replace(/\n/g, ". "));
  writeUrl();
  dirty = true;
}

// ---------- drawing ----------
const sc = $("scene"), ctx = sc.getContext("2d");
let dpr = Math.min(2, window.devicePixelRatio || 1);
const size = { w: 1, h: 1 };
function resize() {
  const a = sc.getBoundingClientRect();
  const w = Math.max(1, Math.round(a.width)), h = Math.max(1, Math.round(a.height));
  if (w !== size.w || h !== size.h) { size.w = w; size.h = h; sc.width = Math.round(w * dpr); sc.height = Math.round(h * dpr); dirty = true; }
}
let t = 0;
const SUN_GOLD = "#ffc43c", IR_COLORS = { co2: "#ff6a4d", h2o: "#4da6ff", ch4: "#b26bff" };
const tempColor = (K) => (K < T_FREEZE ? T.cool : K < 320 ? (T.dark ? "#7fd18b" : "#2e7d32") : T.ir);
function draw() {
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  ctx.fillStyle = T.paper; ctx.fillRect(0, 0, size.w, size.h);
  const m = st.mode, s = cur();
  if (m === "energy") drawEnergy(s);
  else if (m === "greenhouse") drawGreenhouse(s);
  else if (m === "compare") drawCompare(s);
  else if (m === "co2") drawCO2(s);
  else if (m === "feedbacks") drawFeedbacks(s);
  else drawSandbox(s);
}
const phase = () => (reducedMotion ? 0 : t * 4);

// Sun on the left, planet on the right, arrows for sunlight in, reflected and infrared out.
function sunPlanetScene(o) {
  const { w, h } = size, mob = w < 600;
  const top = 26, bot = h - (o.bottom || 0);
  const cy = (top + bot) / 2, sr = Math.min((bot - top) * 0.22, w * 0.12) * (o.sunScale || 1);
  const sx = 10 + Math.min((bot - top) * 0.22, w * 0.12) * Math.max(1, o.sunScale || 1);
  const R = Math.min((bot - top) * 0.3, w * (mob ? 0.17 : 0.15)), px = w * (mob ? 0.56 : 0.58);
  sun(ctx, img, sx, cy, sr, SUN_GOLD);
  planet(ctx, img, o.look || "earth", px, cy, R, o.planet || {});
  const inW = 2 + 6 * Math.min(1, o.S / 2800), refW = Math.max(1.5, inW * o.albedo), irW = 2 + 6 * Math.min(1, o.out / 700);
  const ph = phase();
  for (const dy of [-0.45, 0, 0.45]) arrow(ctx, sx + sr * 0.8, cy + dy * R, px - R * Math.cos(Math.asin(dy)) - 4, cy + dy * R, T.sun, inW);
  arrow(ctx, px - R * 0.9, cy - R * 0.45, px - R * 1.9, cy - R * 1.15, T.sun, refW, false);
  for (const [a, b] of [[-0.6, -1], [0.1, -1], [0.7, -0.8], [0.95, 0.1], [0.7, 0.75]]) {
    const len = Math.hypot(a, b), ux = a / len, uy = b / len;
    arrow(ctx, px + ux * (R + 6), cy + uy * (R + 6), px + ux * (R + R * 0.7), cy + uy * (R + R * 0.7), T.ir, irW, true, ph);
  }
  text(ctx, "sunlight in", sx + sr * 0.8 + 4, cy - R * 0.45 - 12, T.sun, "left", 12, 700);
  text(ctx, "reflected", px - R * 1.9, cy - R * 1.15 - 12, T.sun, "center", 12, 700);
  text(ctx, "infrared out", px + R * 0.5, Math.max(14, cy - R * 1.7 - 12), T.ir, "center", 12, 700);
  return { px, cy, R, top, bot };
}
// Drop reference marks that would overlap the first (current value) mark.
function clearMarks(marks, lo, hi, h) {
  const px = (v) => (h * (v - lo)) / (hi - lo);
  return marks.filter((m, i) => i === 0 || Math.abs(px(m.v) - px(marks[0].v)) > 15);
}
function drawEnergy(s) {
  const { w, h } = size, mob = w < 600, v = shown("energy", s);
  const sc0 = sunPlanetScene({ S: v.S, albedo: v.albedo, out: v.absorbed, look: s.body, bottom: mob ? 92 : 96 });
  const tx = w - (mob ? 62 : 190), th = Math.max(80, h - 210);
  thermometer(ctx, T, tx, 40, th, v.T, 150, 400, tempColor(v.T), clearMarks([{ v: v.T, label: K(v.T), color: T.ink },
    { v: 288, label: mob ? "288" : "288 K Earth's surface" }, { v: 255, label: mob ? "255" : "255 K Earth, no greenhouse" }], 150, 400, th));
  const bx = 16, bw = Math.min(w - 32, 460), by = h - 70, max = 700;
  bar(ctx, T, bx, by, bw, 12, (v.S / 4) / max, T.sun, "Average sunlight arriving S/4", W(v.S / 4));
  bar(ctx, T, bx, by + 40, bw, 12, v.absorbed / max, T.ir, "Absorbed = infrared given off \u03c3T\u2074", W(v.absorbed));
}
function drawGreenhouse(s) {
  const { w, h } = size, mob = w < 600, v = shown("greenhouse", s), ph = phase();
  const gh = Math.min(70, h * 0.13), gy = h - 8;
  ctx.save(); ctx.fillStyle = T.sky; ctx.fillRect(0, 0, w, gy - gh + 8); ctx.restore();
  ground(ctx, img, 0, w, gy, gh);
  const ay0 = h * 0.24, ay1 = h * 0.46;
  ctx.save(); ctx.globalAlpha = 0.12 + 0.35 * v.eps; ctx.fillStyle = T.dark ? "#6d7a99" : "#9fb2cc"; ctx.fillRect(0, ay0, w, ay1 - ay0); ctx.restore();
  text(ctx, "atmosphere layer", 10, ay0 + 12, T.ink, "left", 12, 700);
  const cw = Math.min(150, w * 0.3);
  cloud(ctx, img, 1, w * 0.18, ay0 + 10, cw, 0.95); if (!mob) cloud(ctx, img, 3, w * 0.62, ay1 - 6, cw * 0.8, 0.95);
  sun(ctx, img, w - 40, 40, 28, SUN_GOLD);
  const ms = mob ? 38 : 50, n = Math.round(3 + 9 * v.eps), mix = ["co2", "h2o", "ch4", "h2o", "co2", "h2o"];
  const sel = s.gas;
  for (let i = 0; i < n; i++) {
    const id = sel !== "n2o2" && i % 3 === 0 ? sel : mix[i % mix.length];
    const x = ((i * 0.618 + 0.11) % 1) * (w - 2 * ms) + ms, y = ay0 + 22 + ((i * 0.37) % 1) * (ay1 - ay0 - 34);
    const glow = sel !== "n2o2" && id === sel ? IR_COLORS[id] : null;
    molecule(ctx, img, id, x, y, glow ? ms * 1.15 : ms * 0.85, glow, glow ? 1 : 0.8);
  }
  // sunlight down
  arrow(ctx, w - 60, 70, w * (mob ? 0.86 : 0.72), gy - gh - 6, T.sun, 5);
  text(ctx, mob ? "sunlight" : "sunlight passes through", w * (mob ? 0.86 : 0.72) - 6, gy - gh - 18, T.sun, "right", 12, 700);
  // infrared up from the ground
  const k = 8 / 600, x0 = w * (mob ? 0.34 : 0.28), x1 = w * (mob ? 0.52 : 0.44);
  arrow(ctx, x0, gy - gh, x0, ay1 + 6, T.ir, Math.max(2, v.surfUp * k), true, ph);
  arrow(ctx, x0 - 24, ay0 - 4, x0 - 24, 22, T.ir, Math.max(1.5, v.passes * k), true, ph);
  arrow(ctx, x1, ay0 - 4, x1, 22, T.ir, Math.max(1.5, v.atmEach * k), true, ph);
  arrow(ctx, x1 + 30, ay1 + 4, x1 + 30, gy - gh - 6, T.ir, Math.max(1.5, v.atmEach * k), true, ph);
  text(ctx, mob ? `${Math.round(v.surfUp)} up` : `ground glows ${Math.round(v.surfUp)} W/m\u00b2`, x0 + 10, (ay1 + gy - gh) / 2, T.ink, "left", 12, 700);
  text(ctx, `${Math.round(v.atmEach)} back down`, x1 + 38, (ay1 + gy - gh) / 2 + 20, T.ir, "left", 12, 700);
  text(ctx, "to space", (x0 + x1) / 2 - 12, 12, T.ir, "center", 12, 700);
  const th = Math.max(40, gy - gh - ay1 - 64);
  thermometer(ctx, T, 24, ay1 + 26, th, v.Ts, 240, 320, tempColor(v.Ts), clearMarks([{ v: v.Ts, label: K(v.Ts), color: T.ink }, { v: v.Te, label: "255 K" }], 240, 320, th));
}
function drawCompare(s) {
  const { w, h } = size, mob = w < 600;
  const col = w / 3, R = Math.min(col * 0.3, h * 0.17), cy = 22 + R * 1.35;
  const look = { venus: { shells: 4, haze: 0.85 }, earth: { shells: 2, ice: 1 }, mars: { shells: 0.6 } };
  const by = cy + R * 1.45 + 26, bh = Math.max(60, h - by - 46), max = 800;
  const Y = (K) => by + bh - (bh * K) / max;
  for (const [i, id] of PLANET_IDS.entries()) {
    const p = PLANETS[id], x = col * (i + 0.5), v = shown("compare", { planet: id }), on = id === s.planet;
    planet(ctx, img, id, x, cy, R, look[id]);
    text(ctx, p.name, x, cy + R * 1.35 + 6, T.ink, "center", on ? 15 : 13, on ? 800 : 600);
    const bw = Math.min(26, col * 0.18);
    for (const [j, val, c] of [[-1, v.Te, T.cool], [1, v.Tobs, T.ir]]) {
      const bx = x + j * (bw * 0.6) - bw / 2;
      ctx.save(); ctx.fillStyle = c; ctx.globalAlpha = on ? 1 : 0.55; ctx.fillRect(bx, Y(val), bw, by + bh - Y(val)); ctx.restore();
      text(ctx, fix(val, 0), bx + bw / 2, Y(val) - 9, T.ink, "center", 12, 700);
    }
    if (on) { ctx.save(); ctx.strokeStyle = T.ink; ctx.lineWidth = 2; ctx.setLineDash([5, 4]); ctx.strokeRect(x - col * 0.46, 6, col * 0.92, by + bh + 4 - 6); ctx.restore(); }
  }
  line(ctx, 8, by + bh, w - 8, by + bh, T.ink, 1.5);
  ctx.save(); ctx.fillStyle = T.cool; ctx.fillRect(12, h - 30, 12, 12); ctx.fillStyle = T.ir; ctx.fillRect(mob ? 150 : 210, h - 30, 12, 12); ctx.restore();
  text(ctx, mob ? "no greenhouse (K)" : "equilibrium, no greenhouse (K)", 30, h - 24, T.ink, "left", 12, 600);
  text(ctx, mob ? "observed (K)" : "observed surface average (K)", (mob ? 150 : 210) + 18, h - 24, T.ink, "left", 12, 600);
}
function drawCO2(s) {
  const { w, h } = size, mob = w < 600, v = shown("co2", s);
  const gx = mob ? 44 : 58, gy = 30, gw = w - gx - 18, gh = h - gy - (mob ? 92 : 80);
  const X = (c) => gx + (gw * (c - 250)) / 1000, Y = (d) => gy + gh - (gh * d) / 7;
  ctx.save(); ctx.strokeStyle = T.grid; ctx.lineWidth = 1;
  for (let d = 0; d <= 7; d++) { ctx.beginPath(); ctx.moveTo(gx, Y(d)); ctx.lineTo(gx + gw, Y(d)); ctx.stroke(); }
  ctx.restore();
  for (let d = 0; d <= 7; d++) text(ctx, String(d), gx - 8, Y(d), T.dim, "right", 12);
  for (const c of [300, 500, 700, 900, 1100]) text(ctx, String(c), X(c), gy + gh + 14, T.dim, "center", 12);
  text(ctx, "CO\u2082 (ppm)", gx + gw, gy + gh + 32, T.ink, "right", 12, 700);
  text(ctx, "eventual warming (\u00b0C)", gx, 12, T.ink, "left", 12, 700);
  const curve = (ecs) => { const pts = []; for (let c = 280; c <= 1250; c += 10) pts.push([X(c), Y((ecs * 5.35 * Math.log(c / C0)) / F2X)]); return pts; };
  const lo = curve(ECS.low), hi = curve(ECS.high), best = curve(ECS.best);
  ctx.save(); ctx.fillStyle = T.ir; ctx.globalAlpha = 0.18; ctx.beginPath(); lo.forEach(([x, y], i) => (i ? ctx.lineTo(x, y) : ctx.moveTo(x, y)));
  [...hi].reverse().forEach(([x, y]) => ctx.lineTo(x, Math.max(gy, y))); ctx.closePath(); ctx.fill(); ctx.restore();
  ctx.save(); ctx.beginPath(); ctx.rect(gx, gy, gw, gh); ctx.clip(); ctx.strokeStyle = T.ir; ctx.lineWidth = 2.5; ctx.beginPath(); best.forEach(([x, y], i) => (i ? ctx.lineTo(x, y) : ctx.moveTo(x, y))); ctx.stroke(); ctx.restore();
  text(ctx, "likely range (sensitivity 2.5 to 4 \u00b0C)", X(mob ? 560 : 760), Y(mob ? 6.4 : 5.6), T.ir, "center", 12, 700);
  // Keeling: measured years along the axis
  for (const [yr, c] of KEELING) { ctx.save(); ctx.fillStyle = T.accent; ctx.beginPath(); ctx.arc(X(c), Y(0) - 4, 2.6, 0, 7); ctx.fill(); ctx.restore(); }
  text(ctx, "Mauna Loa 1959 to 2025", X(316), Y(0) - 16, T.accent, "left", 12, 700);
  for (const [c, lab] of [[C0, "pre-industrial 280"], [560, "2\u00d7"], [1120, "4\u00d7"]]) { line(ctx, X(c), gy, X(c), gy + gh, T.dim, 1, [3, 4]); if (c !== C0 || !mob) text(ctx, lab, X(c) + 4, gy + 8, T.dim, "left", 12); }
  line(ctx, X(v.ppm), gy, X(v.ppm), gy + gh, T.ink, 2.5);
  ctx.save(); ctx.fillStyle = T.ink; ctx.beginPath(); ctx.arc(X(v.ppm), Y(v.best), 5, 0, 7); ctx.fill(); ctx.restore();
  text(ctx, `${v.best.toFixed(1)} \u00b0C`, X(v.ppm) + (v.ppm > 900 ? -8 : 8), Y(v.best) - 12, T.ink, v.ppm > 900 ? "right" : "left", 13, 800);
  const ms = mob ? 54 : 70;
  molecule(ctx, img, "co2", gx + ms * 0.7, h - ms * 0.55, ms, IR_COLORS.co2);
  text(ctx, `\u0394F = ${v.F.toFixed(2)} W/m\u00b2`, gx + ms * 1.4, h - ms * 0.55, T.ink, "left", 14, 700);
}
function drawFeedbacks(s) {
  const { w, h } = size, mob = w < 600, v = shown("feedbacks", s);
  const R = Math.min(h * 0.2, w * (mob ? 0.13 : 0.14)), px = 16 + R * 1.2, py = 20 + R * 1.2;
  planet(ctx, img, "earth", px, py, R, { shells: s.on.wvlr ? 1 + Math.min(1, v.dT / 5) : 1, ice: s.on.albedo ? Math.max(0.1, 1 - v.dT / 6) : 1 });
  if (s.on.cloud) cloud(ctx, img, 2, px + R * 0.3, py - R * 0.1, R * 0.9, 0.9);
  text(ctx, s.on.albedo ? (mob ? "ice shrinks" : "ice shrinks as it warms") : "ice-albedo off", px, py + R * 1.25 + 8, T.dim, "center", 12, 600);
  const cx = px + R * 1.3 + 16, cw = w - cx - 12, cy0 = 30;
  const zero = cx + cw * 0.72, sc = (cw * 0.68) / 3.4;
  text(ctx, "feedback parameters, W/(m\u00b2\u00b7K)", cx, cy0, T.ink, "left", 12, 700);
  line(ctx, zero, cy0 + 12, zero, cy0 + 12 + 4 * 30, T.ink, 1.5);
  ["planck", "wvlr", "albedo", "cloud"].forEach((k, i) => {
    const f = FEEDBACKS[k], on = k === "planck" || s.on[k], y = cy0 + 18 + i * 30, x = f.value < 0 ? zero + f.value * sc : zero;
    ctx.save(); ctx.globalAlpha = on ? 1 : 0.25; ctx.fillStyle = f.value < 0 ? T.cool : T.ir; ctx.fillRect(x, y, Math.abs(f.value) * sc, 18); ctx.restore();
    const lab = (mob ? ["Planck", "Water vapor", "Ice-albedo", "Clouds"][i] : f.name) + " " + (f.value > 0 ? "+" : "\u2212") + Math.abs(f.value).toFixed(2);
    text(ctx, lab, f.value < 0 ? x + 6 : zero - 6, y + 9, f.value < 0 ? (T.dark ? "#16181f" : "#ffffff") : T.ink, f.value < 0 ? "left" : "right", 12, 700);
  });
  const by = Math.max(cy0 + 4 * 30 + 50, py + R * 1.25 + 46), bw = w - 32, max = 12;
  bar(ctx, T, 16, by, bw, 14, v.dT0 / max, T.cool, "Planck response alone", fix(v.dT0, 2) + " K");
  bar(ctx, T, 16, by + 42, bw, 14, v.dT / max, T.ir, "With the feedbacks switched on", fix(v.dT, 2) + " K");
  text(ctx, "bars: 0 to 12 K", 16, by + 72, T.dim, "left", 12);
}
function drawSandbox(s) {
  const { w, h } = size, mob = w < 600, v = shown("sandbox", s);
  const n = s.atmosphere ? s.layers : 0;
  const shells = n > 0 ? Math.max(0.3, Math.min(4, Math.log10(n) + 2)) : 0, haze = n > 10 ? Math.min(0.85, (Math.log10(n) - 1) * 0.7) : 0;
  const ice = Math.max(0, Math.min(1, (T_FREEZE - v.Ts) / 25));
  const sc0 = sunPlanetScene({ S: v.S, albedo: v.albedo, out: emitted(v.Te), look: s.look, bottom: 20, sunScale: Math.max(0.45, Math.min(1.5, Math.sqrt(1 / s.dAU))),
    planet: { shells, haze, ice } });
  if (waterState(v.Ts) === "liquid") { cloud(ctx, img, 1, sc0.px - sc0.R * 0.3, sc0.cy + sc0.R * 0.15, sc0.R * 0.8, 0.9); cloud(ctx, img, 3, sc0.px + sc0.R * 0.35, sc0.cy - sc0.R * 0.35, sc0.R * 0.6, 0.9); }
  const tx = w - (mob ? 62 : 150), th = Math.max(80, h - 110);
  thermometer(ctx, T, tx, 40, th, v.Ts, 50, 800, tempColor(v.Ts), clearMarks([{ v: v.Ts, label: K(v.Ts), color: T.ink },
    { v: T_BOIL, label: mob ? "373" : "373 K water boils" }, { v: T_FREEZE, label: mob ? "273" : "273 K water freezes" }], 50, 800, th));
}

let last = 0;
function frame(now) {
  const dt = Math.min(0.1, (now - (last || now)) / 1000); last = now;
  if (!reducedMotion) { t += dt; dirty = true; }
  if (dirty) { dirty = false; resize(); draw(); }
  requestAnimationFrame(frame);
}
$("studyBackBtn").addEventListener("click", (e) => {
  e.preventDefault();
  const qs = forwardStudyQuery(location.search).toString();
  history.replaceState(null, "", qs ? "?" + qs : location.pathname);
  location.href = "study.html" + location.search;
});
if (reducedMotion) document.documentElement.classList.add("reduced-motion");
window.addEventListener("resize", () => { dpr = Math.min(2, window.devicePixelRatio || 1); size.w = 0; resize(); dirty = true; });
new ResizeObserver(() => { resize(); dirty = true; }).observe(sc);
setMode(MODES.includes(st.mode) ? st.mode : "energy");
requestAnimationFrame(frame);
window.__climate = { state: st, shown: () => shown(st.mode, st[st.mode]) };
