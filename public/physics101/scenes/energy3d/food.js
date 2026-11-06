// Every Joule Sim 9: energy in food, stair climb (Tesla C8, W2, W3, O4). Words from text.
import { createEnergyScene, toon, palette, isDark } from "./core.js";
import { FOODS, CLIMB, flightGPE, flightFood, flightsFrom, leastSufficient } from "./physics.js";
import { panel, predict, explain, jar, meterScale, packets, el, fill, jasper, inspector } from "./ui.js";

export function mountFood(host, text = {}, opts = {}) {
  const T = (k, d = "") => text[k] ?? d;
  const S = createEnergyScene(host, { fov: 38, camera: [4.0, 4.0, 7.5], target: [0, 0.9, 0], portrait: { fov: 34, camera: [2.4, 3.4, 7.2], target: [0, 0.75, 0] }, ...opts });
  if (!S) return null;
  jasper(host, "food", T("jasperCard"));
  const { THREE, scene, onFrame } = S;
  const dark = isDark(), M = dark ? "dark" : "light", ink = dark ? "#EDE6D6" : "#2B2622";
  const lbl = (m, t, pos, anchor) => { m.userData.label = t; m.userData.labelPos = pos; if (anchor) m.userData.labelAnchor = anchor; return m; };
  const mesh = (geo, c, x, y, z, par = scene) => { const m = toon(new THREE.Mesh(geo), c); m.position.set(x, y, z); par.add(m); return m; };
  const V = (x, y, z) => new THREE.Vector3(x, y, z);
  // breakfast mat with four foods (Leo's food sheet)
  const MX = -1.7, MZ = 0.3;
  lbl(mesh(new THREE.CylinderGeometry(0.95, 0.95, 0.025, 40), "#C4A779", MX, 0.0125, MZ), T("lbl_mat", "breakfast mat"), "below", V(0, 0, 0.9));
  const bowlGeo = new THREE.LatheGeometry([[0, 0], [0.12, 0.005], [0.2, 0.06], [0.24, 0.16], [0.225, 0.16], [0.18, 0.07], [0, 0.03]].map(([r, y]) => new THREE.Vector2(r, y)), 28);
  const foods = {};
  const g = (x, z) => { const o = new THREE.Group(); o.position.set(MX + x, 0.025, MZ + z); scene.add(o); return o; };
  { const o = foods.porridge = g(-0.4, -0.35); mesh(bowlGeo, "#F4F0E5", 0, 0, 0, o); const oat = mesh(new THREE.SphereGeometry(0.2, 18, 8), "#C9AE7E", 0, 0.12, 0, o); oat.scale.y = 0.2; const sp = mesh(new THREE.BoxGeometry(0.03, 0.015, 0.3), "#A9AFB1", 0.25, 0.17, 0, o); sp.rotation.y = 0.5; }
  { const o = foods.cornflakes = g(0.35, -0.4); mesh(bowlGeo, "#F4F0E5", 0, 0, 0, o); mesh(new THREE.CylinderGeometry(0.2, 0.2, 0.01, 24), "#F7F4EC", 0, 0.12, 0, o);
    for (let i = 0; i < 12; i++) { const f = mesh(new THREE.BoxGeometry(0.06, 0.012, 0.05), "#D8B44F", Math.cos(i * 2.4) * 0.13 * ((i % 3) / 3 + 0.3), 0.135, Math.sin(i * 2.4) * 0.13 * ((i % 3) / 3 + 0.3), o); f.rotation.set(i, i * 0.7, 0); } }
  { const o = foods.toast = g(-0.35, 0.4); mesh(new THREE.CylinderGeometry(0.27, 0.27, 0.025, 28), "#F4F0E5", 0, 0.0125, 0, o);
    for (const [x, z, r] of [[-0.06, 0, 0.2], [0.07, 0.02, -0.25]]) { const t = mesh(new THREE.BoxGeometry(0.3, 0.035, 0.26), "#A66F3F", x, 0.045 + (x > 0 ? 0.035 : 0), z, o); t.rotation.y = r; const c = mesh(new THREE.BoxGeometry(0.26, 0.037, 0.22), "#DDB97C", x, 0.046 + (x > 0 ? 0.035 : 0), z, o); c.rotation.y = r; }
    mesh(new THREE.BoxGeometry(0.08, 0.03, 0.06), "#F1D66B", 0.07, 0.11, 0.02, o); }
  { const o = foods.banana = g(0.4, 0.35); for (let i = 0; i < 7; i++) { const a = -0.9 + i * 0.3, r = 0.04 + 0.025 * Math.sin((i / 6) * Math.PI); const b = mesh(new THREE.SphereGeometry(r, 10, 8), "#E6C843", Math.sin(a) * 0.22, 0.05, 0.12 - Math.cos(a) * 0.22, o); b.scale.set(1.6, 1, 1); b.rotation.y = -a; }
    mesh(new THREE.CylinderGeometry(0.012, 0.015, 0.06, 6), "#6E4A2A", Math.sin(1.0) * 0.22 + 0.04, 0.05, 0.12 - Math.cos(1.0) * 0.22, o).rotation.z = Math.PI / 2; }
  for (const k of ["porridge", "cornflakes"]) {
    const o = foods[k]; const spoon = mesh(new THREE.SphereGeometry(0.045, 12, 8), "#A9AFB1", 0.21, 0.18, -0.12, o); spoon.scale.set(0.7, 0.18, 1.3);
    for (let n = 0; n < 18; n++) { const a = n * 2.4, r = 0.04 + (n % 4) * 0.035; const flake = mesh(new THREE.SphereGeometry(k === "porridge" ? 0.012 : 0.028, 6, 4), k === "porridge" ? "#AD895A" : "#D8B44F", Math.cos(a) * r, 0.14, Math.sin(a) * r, o); flake.scale.y = 0.25; }
  }
  const FOODLBL = { porridge: ["above-left", 0.25], cornflakes: ["above", 0.25], toast: ["left", 0.1], banana: ["below-right", 0.1] };
  const foodKeys = Object.keys(FOODS);
  foodKeys.forEach((k) => { const o = foods[k] || Object.values(foods)[foodKeys.indexOf(k)]; if (o) lbl(o, fill(T("food_" + k, k), { kj: Math.round(FOODS[k] / 1000) }), FOODLBL[k]?.[0] || "above", V(0, FOODLBL[k]?.[1] || 0.2, 0)); });
  // stairs: twelve representative steps with stringers and posts
  const STEPS = 12, SX = 1.0, SZ = 0.9, RISE = 0.12, RUN = 0.28;
  const wood = dark ? "#8C6A48" : "#B58B60";
  const steps = []; for (let i = 0; i < STEPS; i++) steps[i] = mesh(new THREE.BoxGeometry(0.65, RISE * (i + 1), RUN), wood, SX, RISE * (i + 1) / 2, SZ - i * RUN);
  const len = Math.hypot(STEPS * RISE, STEPS * RUN), ang = Math.atan2(STEPS * RISE, STEPS * RUN);
  for (const sx of [-1, 1]) { const st = mesh(new THREE.BoxGeometry(0.04, 0.1, len), "#8C6A48", SX + sx * 0.345, STEPS * RISE / 2 + 0.1, SZ - (STEPS - 1) * RUN / 2); st.rotation.x = ang;
    for (const i of [0, STEPS - 1]) mesh(new THREE.CylinderGeometry(0.025, 0.025, 0.5, 8), "#8C6A48", SX + sx * 0.345, RISE * (i + 1) + 0.25, SZ - i * RUN); }
  lbl(steps[7], T("lbl_stairs", "stairs, 1.75 m per flight model"), "right", V(0.33, RISE * 4, 0));   // wooden mannequin climber
  const climber = new THREE.Group(); scene.add(climber); const tan = "#C7A276";
  mesh(new THREE.SphereGeometry(0.09, 14, 10), tan, 0, 0.62, 0, climber);
  mesh(new THREE.CapsuleGeometry(0.08, 0.2, 4, 10), tan, 0, 0.4, 0, climber);
  for (const sx of [-1, 1]) { mesh(new THREE.CylinderGeometry(0.03, 0.03, 0.26, 8), tan, sx * 0.05, 0.13, 0, climber); const arm = mesh(new THREE.CylinderGeometry(0.025, 0.025, 0.24, 8), tan, sx * 0.12, 0.4, 0, climber); arm.rotation.z = sx * 0.25; }
  lbl(climber, T("lbl_climber", "model climber, 60 kg"), "left", V(0, 0.45, 0));
  const place = (k) => { const f = Math.min(STEPS - 1, k * (STEPS - 1)), i = Math.floor(f), r = f - i; climber.position.set(SX, RISE * (i + 1) + r * RISE, SZ - (i + r) * RUN); };
  place(0);
  // flight counter gauge (round 1 item 2): post, round dial with 0 and 200 ticks and a needle; distinct from the climber
  const GX = SX + 0.85, GY = RISE * STEPS + 0.45, GZ = SZ - (STEPS - 1) * RUN;
  mesh(new THREE.CylinderGeometry(0.03, 0.03, GY, 8), "#5E574D", GX, GY / 2, GZ);
  const face = mesh(new THREE.CylinderGeometry(0.32, 0.32, 0.05, 32), "#FFFDF5", GX, GY + 0.3, GZ); face.rotation.x = Math.PI / 2;
  for (let i = 0; i <= 10; i++) { const a2 = Math.PI * 0.75 - (i / 10) * Math.PI * 1.5, tk = new THREE.Mesh(new THREE.BoxGeometry(0.015, i % 5 ? 0.04 : 0.08, 0.01), new THREE.MeshBasicMaterial({ color: "#2B2622" })); tk.position.set(GX + Math.cos(a2) * 0.26, GY + 0.3 + Math.sin(a2) * 0.26, GZ + 0.03); tk.rotation.z = a2 - Math.PI / 2; scene.add(tk); }
  const needle = new THREE.Mesh(new THREE.BoxGeometry(0.02, 0.24, 0.01), new THREE.MeshBasicMaterial({ color: "#B5473A" })); needle.geometry.translate(0, 0.12, 0); needle.position.set(GX, GY + 0.3, GZ + 0.035); scene.add(needle);
  const setNeedle = (f) => { needle.rotation.z = Math.PI * 0.25 - Math.min(1, f) * Math.PI * 1.5; }; // 0 at upper left, 200 at upper right
  setNeedle(0);
  lbl(face, T("lbl_counter", "flight counter, target 200"), "above-right", V(0, 0.32, 0));
  const ring = face;
  const J = { chem: jar(THREE, scene, toon, 2.3, -0.4, palette.chemical[M], ink), gpe: jar(THREE, scene, toon, 2.85, -0.4, palette.gravitational[M], ink), th: jar(THREE, scene, toon, 3.4, -0.4, palette.thermal[M], ink) };
  for (const [k, d] of [["chem", "chemical"], ["gpe", "gravitational"], ["th", "thermal"]]) J[k].glass.userData.label = T("jar_" + k, d);
  const P = packets(THREE, scene);

  const ui = panel(host, dark, T("takeaway"), T("question", "Which listed breakfast is the least energy that can still fund 200 flights?"));
  inspector(host, ["1 food Calorie = 1 kcal = 4184 J", "climber 60 kg", "1.75 m per flight", "efficiency 0.25", "g = 9.8 N/kg", "food per flight = mgh / efficiency", "sensitivity 0.294: from uphill running, not a stair-climbing limit"], ["GPE 1029 J per flight", "food used 4116 J per flight", "200 flights: 823.2 kJ", "For these exact portions and the declared 25 percent model, buttered toast is the least-energy listed breakfast that reaches 200 flights. This is not a promise about a person's actual climbing capacity."]);
  ui.appendChild(el("div", null, T("defaults")));
  const perFlight = (el("div", null, fill(T("perFlight"), { gpe: Math.round(flightGPE()), food: Math.round(flightFood()), total: (CLIMB.flights * flightFood() / 1000).toFixed(1) })));
  const sel = el("select"); sel.setAttribute("aria-label", T("foodLabel"));
  for (const [k, J0] of Object.entries(FOODS)) { const o = el("option", null, fill(T("food_" + k), { kj: Math.round(J0 / 1000) })); o.value = k; sel.appendChild(o); }
  ui.append(el("label", null, T("foodLabel") + " "), sel);
  // 2 x 2 food selector: 64 px cells, 12 px labels, synced with the select (which stays for keyboard and screen readers)
  const grid4 = el("div", "e3d-foodgrid"); grid4.style.cssText = "display:grid;grid-template-columns:repeat(2,minmax(64px,1fr));gap:8px;width:100%";
  const FCOL = { porridge: "#C9AE7E", cornflakes: "#D8B44F", toast: "#A66F3F", banana: "#E6C843" };
  const cellsF = Object.keys(FOODS).map((k) => { const b2 = el("button"); b2.type = "button"; b2.style.cssText = "min-height:64px;display:flex;align-items:center;gap:8px;padding:6px;border:1.5px solid #2B2622;border-radius:8px;background:#FFFDF5;color:#2B2622;font:16px/1.15 'Patrick Hand','Gochi Hand',cursive;text-align:left";
    const sw = el("span"); sw.style.cssText = `flex:0 0 36px;height:36px;border-radius:50%;border:1.5px solid #2B2622;background:${FCOL[k] || "#ccc"}`; b2.append(sw, el("span", null, fill(T("food_" + k, k), { kj: Math.round(FOODS[k] / 1000) })));
    b2.addEventListener("click", () => { sel.value = k; sel.dispatchEvent(new Event("change")); }); grid4.appendChild(b2); return [k, b2]; });
  ui.appendChild(grid4);
  const ledger = el("div", "e3d-ledger"); ledger.style.cssText = "font-variant-numeric:tabular-nums;font-size:16px"; ledger.hidden = true;
  const effL = el("label", null, T("effLabel")); const eff = el("input"); eff.type = "range"; eff.min = 0.2; eff.max = 0.3; eff.step = 0.001; eff.value = CLIMB.eff; eff.setAttribute("aria-label", T("effLabel"));
  const effOut = el("div"); ui.append(effL, eff, effOut);
  const pr = predict(ui, "e3d-food", T("predict"), Object.keys(FOODS).map((k) => fill(T("food_" + k), { kj: Math.round(FOODS[k] / 1000) })));
  const go = el("button", null, T("climb", "Climb")); go.disabled = true; ui.appendChild(go);
  const fb = el("p"); ui.appendChild(fb);
  const ex = explain(ui, T("explainBtn", "Explain"), T("explain"));
  ui.appendChild(ex.also(el("p", null, T("result"))));
  ui.appendChild(ex.also(perFlight)); ui.appendChild(ledger); // toast result card: hidden until the reveal
  const effNow = () => +eff.value;
  const showEff = () => { const e = effNow(); effOut.textContent = fill(Math.abs(e - 0.294) < 0.0015 ? T("effTag294") : T("effOut"), { e: e.toFixed(3) }); };
  eff.addEventListener("input", showEff); showEff();
  const foodCard = el("div", "e3d-hud e3d-selected-food"); foodCard.style.cssText = `position:absolute;left:8px;top:8px;max-width:260px;padding:5px 8px;border:1.5px solid currentColor;border-radius:8px;z-index:2;font-size:16px;background:${dark ? "#1F1D1A" : "#FBF6EA"};color:${ink}`; host.append(foodCard);
  const leaders = document.createElementNS("http://www.w3.org/2000/svg", "svg"); leaders.style.cssText = "position:absolute;inset:0;width:100%;height:100%;pointer-events:none;z-index:1";
  const selectedLeader = document.createElementNS("http://www.w3.org/2000/svg", "line"); selectedLeader.setAttribute("stroke", ink); selectedLeader.setAttribute("stroke-width", "1.5"); leaders.append(selectedLeader); host.append(leaders);
  onFrame(() => { const o = foods[sel.value]; if (!o) return; const p = o.getWorldPosition(new THREE.Vector3()); p.y += 0.18; p.project(S.camera); const r = foodCard.getBoundingClientRect(), h = host.getBoundingClientRect(); selectedLeader.setAttribute("x1", r.left - h.left + r.width / 2); selectedLeader.setAttribute("y1", r.bottom - h.top); selectedLeader.setAttribute("x2", (p.x + 1) / 2 * host.clientWidth); selectedLeader.setAttribute("y2", (1 - p.y) / 2 * host.clientHeight); });
  const hi = () => {
    meterScale(scene, Math.round(FOODS[sel.value] / 1000), "kJ");
    foodCard.textContent = fill(T("food_" + sel.value, sel.value), { kj: Math.round(FOODS[sel.value] / 1000) });
    foodKeys.forEach((k) => { if (foods[k]) { foods[k].scale.setScalar(k === sel.value ? 1.4 : 1.1); foods[k].userData.label = k === sel.value ? "Selected breakfast" : ""; } });
  };
  sel.addEventListener("change", () => { hi(); cellsF.forEach(([k, b2]) => { b2.style.background = k === sel.value ? "#FFE7A8" : "#FFFDF5"; b2.setAttribute("aria-pressed", String(k === sel.value)); }); }); hi(); sel.dispatchEvent(new Event("change"));
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
    // discrete per-flight ledger from mgh / efficiency: blue steps up by 1029 J, orange by 3087 J (3x at 0.25), green drains 4116 J
    const FOOD = FOODS[sel.value], perG = flightGPE(), perF = perG / effNow(), fl = Math.floor(k * Math.min(n, CLIMB.flights));
    J.chem.set(Math.max(0, 1 - fl * perF / FOOD)); J.gpe.set(fl * perG / FOOD); J.th.set(fl * (perF - perG) / FOOD); setNeedle(fl / CLIMB.flights);
    ring.userData.label = fill(T("lbl_counterN", "flight counter: {f} of 200"), { f: fl });
    ledger.hidden = false; ledger.textContent = fill(T("ledgerLine", "flight {f}: chemical -{c} J, gravitational +{g} J, thermal +{t} J (totals: {C} kJ used)"), { f: fl, c: Math.round(perF), g: Math.round(perG), t: Math.round(perF - perG), C: (fl * perF / 1000).toFixed(1) });
    if (t >= 1) { t = -1; go.disabled = false; }
  });
  return { ...S, dispose() { leaders.remove(); foodCard.remove(); S.dispose(); ui.remove(); } };
}
