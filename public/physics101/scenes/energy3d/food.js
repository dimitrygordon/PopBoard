// Every Joule Sim 9: energy in food, stair climb (Tesla C8, W2, W3, O4). Words from text.
import { createEnergyScene, toon, palette, isDark } from "./core.js";
import { FOODS, CLIMB, flightGPE, flightFood, flightsFrom, leastSufficient } from "./physics.js";
import { panel, predict, explain, jar, packets, el, fill } from "./ui.js";

export function mountFood(host, text = {}, opts = {}) {
  const T = (k, d = "") => text[k] ?? d;
  const S = createEnergyScene(host, { camera: [3, 5, 9], target: [0, 1.4, 0], ...opts });
  if (!S) return null;
  const { THREE, scene, onFrame } = S;
  const dark = isDark(), M = dark ? "dark" : "light", ink = dark ? "#EDE6D6" : "#2B2622";
  const STEPS = 10;
  for (let i = 0; i < STEPS; i++) { const s = toon(new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.3 * (i + 1), 1.4)), dark ? "#6F665A" : "#D9C7A2"); s.position.set(-3 + i * 0.5, 0.15 * (i + 1), 0); scene.add(s); }
  const climber = toon(new THREE.Mesh(new THREE.CapsuleGeometry(0.18, 0.5, 4, 12)), palette.kinetic[M]); scene.add(climber);
  const place = (k) => { const i = Math.min(STEPS - 1, Math.floor(k * STEPS)); climber.position.set(-3 + i * 0.5, 0.3 * (i + 1) + 0.45, 0); };
  place(0);
  const J = { chem: jar(THREE, scene, toon, 2.4, 0, palette.chemical[M], ink), gpe: jar(THREE, scene, toon, 3.1, 0, palette.gravitational[M], ink), th: jar(THREE, scene, toon, 3.8, 0, palette.thermal[M], ink) };
  const P = packets(THREE, scene);

  const ui = panel(host, dark);
  ui.appendChild(el("div", null, T("defaults")));
  ui.appendChild(el("div", null, fill(T("perFlight"), { gpe: Math.round(flightGPE()), food: Math.round(flightFood()), total: (CLIMB.flights * flightFood() / 1000).toFixed(1) })));
  const sel = el("select"); sel.setAttribute("aria-label", T("foodLabel"));
  for (const [k, J0] of Object.entries(FOODS)) { const o = el("option", null, fill(T("food_" + k), { kj: Math.round(J0 / 1000) })); o.value = k; sel.appendChild(o); }
  ui.append(el("label", null, T("foodLabel") + " "), sel);
  const effL = el("label", null, T("effLabel")); const eff = el("input"); eff.type = "range"; eff.min = 0.2; eff.max = 0.3; eff.step = 0.001; eff.value = CLIMB.eff; eff.setAttribute("aria-label", T("effLabel"));
  const effOut = el("div"); ui.append(effL, eff, effOut);
  const pr = predict(ui, "e3d-food", T("predict"), Object.keys(FOODS).map((k) => fill(T("food_" + k), { kj: Math.round(FOODS[k] / 1000) })));
  const go = el("button", null, T("climb", "Climb")); go.disabled = true; ui.appendChild(go);
  const fb = el("p"); ui.appendChild(fb);
  const ex = explain(ui, T("explainBtn", "Explain"), T("explain"));
  ui.appendChild(el("p", null, T("result")));
  const effNow = () => +eff.value;
  const showEff = () => { const e = effNow(); effOut.textContent = fill(Math.abs(e - 0.294) < 0.0015 ? T("effTag294") : T("effOut"), { e: e.toFixed(3) }); };
  eff.addEventListener("input", showEff); showEff();
  pr.onPick(() => { go.disabled = false; });
  let t = -1, n = 0;
  go.addEventListener("click", () => {
    const k = sel.value; n = flightsFrom(FOODS[k], CLIMB.m, CLIMB.h, effNow()); t = 0; go.disabled = true;
    const best = leastSufficient(CLIMB.flights, CLIMB.m, CLIMB.h, CLIMB.eff), mine = Object.keys(FOODS)[pr.picked()];
    fb.textContent = fill(T(mine === best ? "right" : "wrong"), { n: n.toFixed(1) });
    ex.show();
  });
  onFrame((dt) => {
    P.step(dt);
    if (t < 0) return;
    t += dt * (S.reduce ? 0.5 : 0.25);
    const k = Math.min(1, t), done = Math.min(n, CLIMB.flights) / CLIMB.flights; // share of the 200-flight goal reached
    place(k * done);
    J.chem.set(1 - k); J.gpe.set(k * CLIMB.eff); J.th.set(k * (1 - CLIMB.eff));
    if (!S.reduce && Math.random() < 0.2) P.send(J.chem.top(), Math.random() < CLIMB.eff ? J.gpe.top() : J.th.top(), Math.random() < CLIMB.eff ? palette.gravitational[M] : palette.thermal[M]);
    if (t >= 1) { t = -1; go.disabled = false; }
  });
  return { ...S, dispose() { S.dispose(); ui.remove(); } };
}
