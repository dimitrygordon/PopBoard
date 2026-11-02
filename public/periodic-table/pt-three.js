// Three.js views for the detail drawer: Bohr 3D (nucleon spheres, tilted rings) and QM orbital clouds
// (points sampled from the orbital's angular shape, colored by the sign of the wave). Drag or arrow keys
// rotate; reduced motion renders a still frame and redraws only on input.
import * as THREE from "../vendor/three/three.module.min.js";
import { orbitalCloud } from "./pt-core.js";
const css = (n) => getComputedStyle(document.documentElement).getPropertyValue(n).trim() || "#888";
const reduced = () => matchMedia("(prefers-reduced-motion: reduce)").matches;

function stage(cv) {
  const w = cv.width, h = cv.height;
  const r = new THREE.WebGLRenderer({ canvas: cv, antialias: true, alpha: true, preserveDrawingBuffer: true });
  r.setPixelRatio(Math.min(2, devicePixelRatio || 1)); r.setSize(w, h, false); cv.style.width = w + "px"; cv.style.aspectRatio = `${w}/${h}`;
  const scene = new THREE.Scene(), cam = new THREE.PerspectiveCamera(35, w / h, 0.1, 100); cam.position.set(0, 0, 6.2);
  scene.add(new THREE.AmbientLight(0xffffff, 0.75)); const dl = new THREE.DirectionalLight(0xffffff, 0.9); dl.position.set(2, 3, 4); scene.add(dl);
  const root = new THREE.Group(); scene.add(root);
  let raf = 0, live = true, drag = null, spin = 0.25;
  const draw = () => r.render(scene, cam);
  const frame = (t) => { if (!live) return; if (!drag && !reduced()) root.rotation.y += spin / 60; draw(); raf = requestAnimationFrame(frame); };
  cv.onpointerdown = (ev) => { drag = [ev.clientX, ev.clientY, root.rotation.x, root.rotation.y]; cv.setPointerCapture(ev.pointerId); };
  cv.onpointermove = (ev) => { if (!drag) return; root.rotation.y = drag[3] + (ev.clientX - drag[0]) * 0.01; root.rotation.x = drag[2] + (ev.clientY - drag[1]) * 0.01; if (reduced()) draw(); };
  cv.onpointerup = cv.onpointercancel = () => { drag = null; };
  cv.onkeydown = (ev) => { const d = { ArrowLeft: [0, -0.2], ArrowRight: [0, 0.2], ArrowUp: [-0.2, 0], ArrowDown: [0.2, 0] }[ev.key]; if (d) { ev.preventDefault(); ev.stopPropagation(); root.rotation.x += d[0]; root.rotation.y += d[1]; draw(); } };
  return { THREE, root, start() { draw(); if (!reduced()) raf = requestAnimationFrame(frame); }, setSpin(v) { spin = v; }, stop() { live = false; cancelAnimationFrame(raf); r.dispose(); } };
}
const mat = (c) => new THREE.MeshLambertMaterial({ color: new THREE.Color(c) });

export function bohr3d(cv, e) {
  const s = stage(cv), n = e.shells.length, R = 2.2;
  s.root.rotation.x = 0.5;
  const A = Math.min(120, e.z + (e.neutrons ?? 0)), nucR = 0.12 + 0.05 * Math.cbrt(A);
  const geo = new THREE.SphereGeometry(0.075, 12, 10);
  const p = new THREE.InstancedMesh(geo, mat(css("--pt-proton")), A), m4 = new THREE.Matrix4(), col = new THREE.Color();
  const pc = new THREE.Color(css("--pt-proton")), nc = new THREE.Color(css("--pt-neutron"));
  for (let i = 0; i < A; i++) { const u = (i + 0.5) / A, a = i * 2.39996, rr = nucR * Math.cbrt(u), y = 1 - 2 * u, k = Math.sqrt(1 - y * y);
    m4.makeTranslation(rr * k * Math.cos(a), rr * y, rr * k * Math.sin(a)); p.setMatrixAt(i, m4); p.setColorAt(i, (i * e.z / A) % 1 < e.z / A || i % 2 === 0 && i / 2 < e.z ? pc : nc); }
  s.root.add(p);
  const eg = new THREE.SphereGeometry(0.05, 10, 8), em = mat(css("--pt-electron")), lm = new THREE.LineBasicMaterial({ color: new THREE.Color(css("--pt-line")) });
  const shells = [];
  e.shells.forEach((k, i) => { const r = 0.5 + (R - 0.5) * (i + 1) / n, g = new THREE.Group(); g.rotation.x = (i % 3 - 1) * 0.35; g.rotation.z = i * 0.4;
    const pts = []; for (let a = 0; a <= 96; a++) pts.push(new THREE.Vector3(r * Math.cos(a / 96 * Math.PI * 2), 0, r * Math.sin(a / 96 * Math.PI * 2)));
    g.add(new THREE.Line(new THREE.BufferGeometry().setFromPoints(pts), lm));
    const ring = new THREE.Group(); for (let j = 0; j < k; j++) { const s2 = new THREE.Mesh(eg, em), a = j / k * Math.PI * 2; s2.position.set(r * Math.cos(a), 0, r * Math.sin(a)); ring.add(s2); }
    g.add(ring); shells.push([ring, 0.9 / (i + 1)]); s.root.add(g); });
  const base = s.stop; let raf = 0, live = true;
  const spin = () => { if (!live) return; shells.forEach(([g, w]) => { g.rotation.y += w / 60; }); raf = requestAnimationFrame(spin); };
  s.start(); if (!reduced()) raf = requestAnimationFrame(spin);
  return { stop() { live = false; cancelAnimationFrame(raf); base(); } };
}
export function qmView(cv, { l, m, n }) {
  const s = stage(cv); s.setSpin(0.3); s.root.rotation.set(0.45, 0.6, 0);
  const pts = orbitalCloud(l, m, l === "s" ? 2600 : 4200, 11 + n), scale = l === "s" ? 1.2 + 0.18 * n : 2.1;
  for (const sign of [1, -1]) {
    const arr = pts.filter((q) => q[3] === sign).flatMap(([x, y, z]) => [x * scale, z * scale, y * scale]); // z up
    if (!arr.length) continue;
    const g = new THREE.BufferGeometry(); g.setAttribute("position", new THREE.Float32BufferAttribute(arr, 3));
    s.root.add(new THREE.Points(g, new THREE.PointsMaterial({ color: new THREE.Color(css(sign > 0 ? "--pt-orb-pos" : "--pt-orb-neg")), size: 0.035, transparent: true, opacity: 0.75, depthWrite: false })));
  }
  const lm = new THREE.LineBasicMaterial({ color: new THREE.Color(css("--pt-line")) });
  for (const v of [[1, 0, 0], [0, 1, 0], [0, 0, 1]]) s.root.add(new THREE.Line(new THREE.BufferGeometry().setFromPoints([new THREE.Vector3(...v).multiplyScalar(-2.4), new THREE.Vector3(...v).multiplyScalar(2.4)]), lm));
  s.root.add(new THREE.Mesh(new THREE.SphereGeometry(0.07, 12, 10), mat(css("--pt-nucleus"))));
  s.start(); return { stop: s.stop };
}
