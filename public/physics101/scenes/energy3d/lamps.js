// Every Joule Sim 7: filament vs LED at matched lumens (Tesla C10). The light ribbon is drawn, never numbered. Words from text.
import { createEnergyScene, toon, palette, isDark } from "./core.js";
import { LAMPS, lumens, matched, ledWattsFor, powerSaving } from "./physics.js";
import { panel, predict, explain, packets, el, fill } from "./ui.js";

export function mountLamps(host, text = {}, opts = {}) {
  const T = (k, d = "") => text[k] ?? d;
  const S = createEnergyScene(host, { camera: [0, 3, 8], target: [0, 1.4, 0], ...opts });
  if (!S) return null;
  const { THREE, scene, onFrame } = S;
  const dark = isDark(), M = dark ? "dark" : "light";
  const lamp = (x) => {
    const stand = toon(new THREE.Mesh(new THREE.CylinderGeometry(0.08, 0.3, 1.6, 12)), dark ? "#8A8378" : "#9C8B6E"); stand.position.set(x, 0.8, 0); scene.add(stand);
    const bulb = new THREE.Mesh(new THREE.SphereGeometry(0.3, 20, 14), new THREE.MeshBasicMaterial({ color: palette.light[M] })); bulb.position.set(x, 1.9, 0); scene.add(bulb);
    const glow = new THREE.PointLight(0xFFE29A, 0, 6); glow.position.copy(bulb.position); scene.add(glow);
    return { bulb, glow };
  };
  const fil = lamp(-1.8), led = lamp(1.8);
  const P = packets(THREE, scene);

  const ui = panel(host, dark);
  ui.append(el("div", null, T("filament")), el("div", null, T("ledRated")));
  const pr = predict(ui, "e3d-lamps", T("predict"), text.choices);
  const wl = el("label", null, T("wattLabel")); const w = el("input"); w.type = "number"; w.step = "0.01"; w.min = "0"; w.setAttribute("aria-label", T("wattLabel")); ui.append(wl, w);
  const sl = el("label", null, T("sliderLabel")); const s = el("input"); s.type = "range"; s.min = 1; s.max = 12; s.step = 0.01; s.value = 3; s.disabled = true; s.setAttribute("aria-label", T("sliderLabel")); ui.append(sl, s);
  const meter = el("div"); ui.appendChild(meter);
  const fb = el("p"); ui.appendChild(fb);
  const ex = explain(ui, T("explainBtn", "Explain"), T("explain"));
  ui.appendChild(el("p", null, T("card")));
  const lock = () => { s.disabled = !(pr.picked() != null && +w.value > 0); };
  pr.onPick(lock); w.addEventListener("input", lock);
  function update() {
    const W = +s.value, lm = lumens("led", W), lf = lumens("filament", LAMPS.filament.W);
    fil.glow.intensity = 2; led.glow.intensity = 2 * (lm / lf);
    led.bulb.scale.setScalar(0.6 + 0.4 * Math.min(1.5, lm / lf));
    meter.textContent = fill(T("meter"), { W: W.toFixed(2), lm: Math.round(lm), f: Math.round(lf) });
    if (matched(lm)) { fb.textContent = fill(T("matched"), { need: ledWattsFor().toFixed(2), less: (powerSaving() * 100).toFixed(1), guess: (+w.value).toFixed(2) }); ex.show(); }
    else fb.textContent = "";
  }
  s.addEventListener("input", update); update();
  let acc = 0;
  onFrame((dt) => {
    P.step(dt); acc += dt;
    if (S.reduce || acc < 0.25) return; acc = 0;
    // electrical in (pale blue) to each lamp; filament also sheds many thermal packets. Shapes only, no numbers (C10).
    P.send(new THREE.Vector3(-1.8, 0, 1), fil.bulb.position, palette.electrical[M]);
    P.send(new THREE.Vector3(1.8, 0, 1), led.bulb.position, palette.electrical[M]);
    P.send(fil.bulb.position, fil.bulb.position.clone().add(new THREE.Vector3(-1, 1, 0.5)), palette.thermal[M]);
    P.send(fil.bulb.position, fil.bulb.position.clone().add(new THREE.Vector3(0, 1.2, 1)), palette.light[M]);
    P.send(led.bulb.position, led.bulb.position.clone().add(new THREE.Vector3(0, 1.2, 1)), palette.light[M]);
  });
  return { ...S, dispose() { S.dispose(); ui.remove(); } };
}
