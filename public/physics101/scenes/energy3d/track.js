// Every Joule Sim 2: curvy track, friction off vs on (Tesla C1, C2). No friction coefficient is shown. Words from text.
import { createEnergyScene, toon, palette, isDark } from "./core.js";
import { speedAt, energyAt, FRICTION_DRAW } from "./physics.js";
import { panel, predict, explain, jar, packets, el, fill } from "./ui.js";

const SC = 1.2, HALF = 3; // track y = k x^2 in scene units
export function mountTrack(host, text = {}, opts = {}) {
  const T = (k, d = "") => text[k] ?? d;
  const S = createEnergyScene(host, { camera: [0, 3.5, 9], target: [0, 1.4, 0], ...opts });
  if (!S) return null;
  const { THREE, scene, addDrag, onFrame } = S;
  const dark = isDark(), M = dark ? "dark" : "light", ink = dark ? "#EDE6D6" : "#2B2622";
  const k = 0.3, yOf = (x) => k * x * x; // metres of height = y / SC
  const pts = []; for (let i = 0; i <= 60; i++) { const x = -HALF + (i / 60) * 2 * HALF; pts.push(new THREE.Vector3(x, yOf(x) + 0.05, 0)); }
  const tube = toon(new THREE.Mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts), 120, 0.06, 8)), dark ? "#8A8378" : "#9C8B6E"); scene.add(tube);
  const ball = toon(new THREE.Mesh(new THREE.SphereGeometry(0.18, 24, 16)), palette.kinetic[M]);
  ball.add(new THREE.Mesh(new THREE.SphereGeometry(0.4, 8, 6), new THREE.MeshBasicMaterial({ visible: false }))); scene.add(ball);
  const zero = new THREE.Mesh(new THREE.BoxGeometry(2 * HALF + 1, 0.01, 0.01), new THREE.MeshBasicMaterial({ color: ink })); zero.position.set(0, 0.06, 0.4); scene.add(zero);
  const mark = new THREE.Mesh(new THREE.BoxGeometry(0.6, 0.02, 0.02), new THREE.MeshBasicMaterial({ color: palette.elastic[M] })); scene.add(mark);
  const J = { gpe: jar(THREE, scene, toon, 4.2, 0, palette.gravitational[M], ink), ke: jar(THREE, scene, toon, 4.9, 0, palette.kinetic[M], ink), th: jar(THREE, scene, toon, 5.6, 0, palette.thermal[M], ink) };
  const P = packets(THREE, scene);
  let x0 = -2.4, friction = false, running = false, t = 0;
  const yMax = yOf(HALF);
  const putAt = (x) => { ball.position.set(x, yOf(x) + 0.23, 0); };
  putAt(x0); mark.position.set(-x0, yOf(x0) + 0.05, 0);
  addDrag(ball, { axis: "y", min: 0.6, max: yMax, onMove: (y) => { if (running) return; x0 = -Math.sqrt(Math.max(0, (y - 0.23) / k)); putAt(x0); mark.position.set(-x0, yOf(x0) + 0.05, 0); readout(0); } });

  const ui = panel(host, dark);
  ui.append(el("div", null, T("formulas")), el("div", null, T("rolling")));
  const fr = el("button", null, T("frictionOff")); fr.setAttribute("aria-pressed", "false"); ui.appendChild(fr);
  const read = el("div"); ui.appendChild(read);
  const pOff = predict(ui, "e3d-track-off", T("predictOff"), text.choices);
  const pOn = predict(ui, "e3d-track-on", T("predictOn"), text.choices);
  const go = el("button", null, T("release", "Release")); go.disabled = true; ui.appendChild(go);
  const fb = el("p"); ui.appendChild(fb);
  const ex = explain(ui, T("explainBtn", "Explain"), T("explain"));
  const ready = () => { go.disabled = (friction ? pOn : pOff).picked() == null; };
  pOff.onPick(ready); pOn.onPick(ready);
  fr.addEventListener("click", () => { if (running) return; friction = !friction; fr.textContent = friction ? T("frictionOn") : T("frictionOff"); fr.setAttribute("aria-pressed", String(friction)); ready(); });
  const h0 = () => yOf(x0) / SC;
  function readout(lost) {
    const h = (ball.position.y - 0.23) / SC, v = speedAt(h0(), h) * Math.sqrt(1 - lost), m = 1;
    const E = energyAt(m, h, v), E0 = energyAt(m, h0(), 0).total;
    J.gpe.set(E.gpe / E0 * 0.9); J.ke.set(E.ke / E0 * 0.9); J.th.set(lost * 0.9);
    read.textContent = friction ? T("readFriction") : fill(T("readOff"), { me: (E.total / E0 * 100).toFixed(1) });
  }
  readout(0);
  go.addEventListener("click", () => {
    running = true; t = 0; go.disabled = true; fr.disabled = true;
    const want = 1; // 0 below, 1 equal, 2 above (friction off); friction on expects 0
    const pick = (friction ? pOn : pOff).picked();
    fb.textContent = pick === (friction ? 0 : want) ? T("right") : T("wrong"); ex.show();
  });
  onFrame((dt) => {
    P.step(dt);
    if (!running) return;
    t += dt * (S.reduce ? 2 : 1);
    const w = Math.sqrt(2 * 9.8 * k / SC) * 0.9, damp = friction ? Math.pow(FRICTION_DRAW, t / Math.PI * w) : 1;
    const x = x0 * Math.cos(w * t) * damp; putAt(x);
    const lost = 1 - damp * damp; readout(lost);
    if (friction && !S.reduce && Math.random() < 0.15) P.send(ball.position, J.th.top(), palette.thermal[M]);
    if (t * w >= Math.PI * 3) { running = false; fr.disabled = false; ready(); putAt(x0); readout(0); }
  });
  return { ...S, dispose() { S.dispose(); ui.remove(); } };
}
