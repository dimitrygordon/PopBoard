// Every Joule Sim 10: nothing is lost. Breakfast energy in a declared closed room (Tesla C9, C1). Words from text.
import { createEnergyScene, toon, palette, isDark } from "./core.js";
import { journey, JOURNEY } from "./physics.js";
import { panel, predict, explain, jar, packets, el, fill } from "./ui.js";

export function mountJourney(host, text = {}, opts = {}) {
  const T = (k, d = "") => text[k] ?? d;
  const S = createEnergyScene(host, { camera: [0, 4.5, 9], target: [0, 1, 0], ...opts });
  if (!S) return null;
  const { THREE, scene, addDrag, onFrame } = S;
  const dark = isDark(), M = dark ? "dark" : "light", ink = dark ? "#EDE6D6" : "#2B2622";
  // room boundary (decorative)
  const room = new THREE.LineSegments(new THREE.EdgesGeometry(new THREE.BoxGeometry(7, 3, 3)), new THREE.LineBasicMaterial({ color: ink })); room.position.set(-1, 1.5, 0); scene.add(room);
  const person = toon(new THREE.Mesh(new THREE.CapsuleGeometry(0.22, 0.7, 4, 12)), palette.kinetic[M]); person.position.set(-4, 0.6, 0); scene.add(person);
  const J = { food: jar(THREE, scene, toon, 3.4, -0.5, palette.chemical[M], ink), kinetic: jar(THREE, scene, toon, 4.1, -0.5, palette.kinetic[M], ink), thermal: jar(THREE, scene, toon, 4.8, -0.5, palette.thermal[M], ink) };
  const total = new THREE.Mesh(new THREE.BoxGeometry(2.2, 0.12, 0.12), new THREE.MeshBasicMaterial({ color: ink })); total.position.set(4.1, 1.95, -0.5); scene.add(total);
  const P = packets(THREE, scene);
  // timeline cursor: drag along x to scrub (presentation only)
  const cursor = toon(new THREE.Mesh(new THREE.BoxGeometry(0.3, 0.3, 0.3)), palette.elastic[M]);
  const TX = [-4, 2]; cursor.position.set(TX[0], 0.15, 1.6); scene.add(cursor);
  const line = new THREE.Mesh(new THREE.BoxGeometry(TX[1] - TX[0], 0.03, 0.03), new THREE.MeshBasicMaterial({ color: ink })); line.position.set((TX[0] + TX[1]) / 2, 0.02, 1.6); scene.add(line);

  const ui = panel(host, dark);
  ui.append(el("div", null, T("equation")), el("div", null, T("values")));
  const read = el("div"); ui.appendChild(read);
  const pr = predict(ui, "e3d-journey", T("predict"), text.choices);
  const go = el("button", null, T("play", "Play")); go.disabled = true; ui.appendChild(go);
  const fb = el("p"); ui.appendChild(fb);
  const ex = explain(ui, T("explainBtn", "Explain"), T("explain"));
  ui.append(el("p", null, T("closed")), el("p", null, T("footer")));
  let phase = 0, playing = false, locked = true;
  const show = () => {
    const s = journey(phase), f = JOURNEY.food;
    J.food.set(s.food / f); J.kinetic.set(s.kinetic / f); J.thermal.set(s.thermal / f);
    person.position.x = -4 + Math.min(phase, 1.4) * 4;
    cursor.position.x = TX[0] + (phase / 2) * (TX[1] - TX[0]);
    read.textContent = fill(T("readout"), { food: s.food.toFixed(1), ke: s.kinetic.toFixed(1), th: s.thermal.toFixed(1), total: (s.food + s.kinetic + s.thermal).toFixed(1) });
  };
  show();
  addDrag(cursor, { axis: "x", min: TX[0], max: TX[1], onMove: (x) => { if (locked) { cursor.position.x = TX[0]; return; } playing = false; phase = ((x - TX[0]) / (TX[1] - TX[0])) * 2; show(); } });
  pr.onPick(() => { go.disabled = false; locked = false; });
  go.addEventListener("click", () => { phase = 0; playing = true; fb.textContent = pr.picked() === (text.correct ?? 1) ? T("right") : T("wrong"); ex.show(); });
  onFrame((dt) => {
    P.step(dt);
    if (!playing) return;
    const prev = phase; phase = Math.min(2, phase + dt * (S.reduce ? 1 : 0.4)); show();
    if (!S.reduce && Math.random() < 0.15) P.send(J.food.top(), phase < 1 && Math.random() < 0.25 ? J.kinetic.top() : J.thermal.top(), palette.thermal[M]);
    if (prev < 2 && phase >= 2) playing = false;
  });
  return { ...S, dispose() { S.dispose(); ui.remove(); } };
}
