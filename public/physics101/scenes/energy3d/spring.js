// Every Joule Sim 3: spring launcher, ideal-spring model only (Tesla O1). Words from text; Tesla wording in story.json.
import { createEnergyScene, toon, palette, isDark } from "./core.js";
import { SPRING, LAUNCH_H, elasticPE, launchKE, apexKE, apexHeight } from "./physics.js";
import { panel, predict, explain, jar, packets, el, fill } from "./ui.js";

const SC = 3; // scene units per metre
export function mountSpring(host, text = {}, opts = {}) {
  const T = (k, d = "") => text[k] ?? d;
  const S = createEnergyScene(host, { camera: [1, 3, 9], target: [1, 2, 0], ...opts });
  if (!S) return null;
  const { THREE, scene, addDrag, onFrame } = S;
  const dark = isDark(), M = dark ? "dark" : "light", ink = dark ? "#EDE6D6" : "#2B2622";
  const th = (SPRING.angle * Math.PI) / 180, dir = new THREE.Vector3(Math.cos(th), Math.sin(th), 0);
  const base = new THREE.Vector3(-2, LAUNCH_H * SC, 0);
  const rail = toon(new THREE.Mesh(new THREE.BoxGeometry(1.2, 0.06, 0.2)), dark ? "#8A8378" : "#9C8B6E");
  rail.position.copy(base).addScaledVector(dir, -0.3); rail.rotation.z = th; scene.add(rail);
  const post = toon(new THREE.Mesh(new THREE.BoxGeometry(0.2, LAUNCH_H * SC, 0.2)), dark ? "#6F665A" : "#C9B48E"); post.position.set(base.x - 0.6, (LAUNCH_H * SC) / 2, 0); scene.add(post);
  const coil = toon(new THREE.Mesh(new THREE.CylinderGeometry(0.1, 0.1, 1, 12, 1, true)), palette.elastic[M]); coil.rotation.z = th - Math.PI / 2; scene.add(coil);
  const ball = toon(new THREE.Mesh(new THREE.SphereGeometry(0.12, 20, 14)), palette.kinetic[M]); scene.add(ball);
  const tab = toon(new THREE.Mesh(new THREE.BoxGeometry(0.3, 0.3, 0.3)), palette.elastic[M]); scene.add(tab);
  const bell = toon(new THREE.Mesh(new THREE.ConeGeometry(0.2, 0.3, 16)), "#E2B654"); bell.position.set(base.x + 1.6, SPRING.bell * SC, 0); scene.add(bell);
  const limit = new THREE.Mesh(new THREE.BoxGeometry(0.04, 0.3, 0.3), new THREE.MeshBasicMaterial({ color: "#B5473A" })); scene.add(limit);
  limit.position.copy(base).addScaledVector(dir, -SPRING.xMax * SC * 4);
  const J = { el: jar(THREE, scene, toon, 3.6, 0, palette.elastic[M], ink), ke: jar(THREE, scene, toon, 4.3, 0, palette.kinetic[M], ink), gpe: jar(THREE, scene, toon, 5.0, 0, palette.gravitational[M], ink) };
  const P = packets(THREE, scene);
  let x = 0.05, running = false, t = 0;
  const VIS = 4; // extension drawn 4x so 0.080 m is visible
  const setX = (v) => { x = Math.max(0, Math.min(SPRING.xMax, v)); const p = base.clone().addScaledVector(dir, -x * SC * VIS); ball.position.copy(p).addScaledVector(dir, 0.12); tab.position.copy(p).addScaledVector(dir, -0.25); coil.position.copy(p).addScaledVector(dir, -0.5); readout(); };
  addDrag(tab, { axis: "y", min: base.y - SPRING.xMax * SC * VIS * Math.sin(th) - 0.25 * Math.sin(th) - 0.01, max: base.y - 0.25 * Math.sin(th), onMove: (y) => { if (running) return; setX((base.y - 0.25 * Math.sin(th) - y) / (SC * VIS * Math.sin(th))); } });

  const ui = panel(host, dark);
  ui.append(el("div", null, T("labels")), el("p", null, T("model")));
  const read = el("div"); ui.appendChild(read);
  const pr = predict(ui, "e3d-spring", T("predict"), text.choices);
  const go = el("button", null, T("release", "Release")); go.disabled = true; ui.appendChild(go);
  const fb = el("p"); ui.appendChild(fb);
  const ex = explain(ui, T("explainBtn", "Explain"), T("explain"));
  function readout() {
    const E = elasticPE(x), top = elasticPE(SPRING.xMax);
    read.textContent = fill(T("readout"), { x: x.toFixed(4), pe: E.toFixed(3), apex: apexKE(x).toFixed(4), h: apexHeight(x).toFixed(3) });
    if (!running) { J.el.set(E / top); J.ke.set(0); J.gpe.set(0); }
  }
  setX(x);
  pr.onPick(() => { go.disabled = false; });
  let v0, path;
  go.addEventListener("click", () => {
    running = true; t = 0; go.disabled = true;
    const ke = Math.max(0, launchKE(x)); v0 = Math.sqrt((2 * ke) / SPRING.m);
    fb.textContent = pr.picked() === (text.correct ?? 2) ? T("right") : T("wrong"); ex.show();
    const h = apexHeight(x); fb.textContent += " " + fill(T(Math.abs(h - SPRING.bell) <= SPRING.bellTol ? "ring" : "miss"), { h: h.toFixed(3) });
  });
  onFrame((dt) => {
    P.step(dt);
    if (!running) return;
    t += dt * (S.reduce ? 1 : 0.5);
    const vx = v0 * Math.cos(th), vy = v0 * Math.sin(th) - 9.8 * t;
    const px = base.x + vx * t * SC, py = base.y + (v0 * Math.sin(th) * t - 4.9 * t * t) * SC;
    ball.position.set(px, Math.max(0.12, py), 0);
    const E0 = elasticPE(SPRING.xMax), ke = 0.5 * SPRING.m * (vx * vx + vy * vy), gpe = Math.max(0, elasticPE(x) - ke);
    J.el.set(0); J.ke.set(ke / E0); J.gpe.set(gpe / E0);
    if (!S.reduce && Math.random() < 0.15) P.send(J.el.top(), Math.random() < 0.5 ? J.ke.top() : J.gpe.top(), palette.kinetic[M]);
    if (py <= 0.12) { running = false; go.disabled = false; setX(x); }
  });
  return { ...S, dispose() { S.dispose(); ui.remove(); } };
}
