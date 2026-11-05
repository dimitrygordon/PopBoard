import * as THREE from "../../../vendor/three/three.module.min.js";
import { palette } from "./palette.js";
export { THREE, palette };

const clamp = (v, a, b) => Math.min(b, Math.max(a, v));
const hasDoc = () => typeof document !== "undefined";
export function isDark() {
  if (!hasDoc()) return false;
  const t = document.documentElement.dataset.theme;
  if (t) return t === "dark";
  return typeof matchMedia === "function" && matchMedia("(prefers-color-scheme: dark)").matches;
}
function reduced() {
  return typeof matchMedia === "function" && matchMedia("(prefers-reduced-motion: reduce)").matches;
}
function webgl() {
  try {
    const c = document.createElement("canvas");
    return !!(window.WebGL2RenderingContext && c.getContext("webgl2")) || !!c.getContext("webgl");
  } catch { return false; }
}

export function toon(mesh, color) {
  mesh.material = new THREE.MeshToonMaterial({ color });
  mesh.castShadow = true;
  const ink = new THREE.Mesh(mesh.geometry, new THREE.MeshBasicMaterial({ color: isDark() ? 0xEDE6D6 : 0x2B2622, side: THREE.BackSide }));
  ink.scale.setScalar(1.025);
  ink.castShadow = false;
  ink.raycast = () => {};
  ink.userData.ink = true;
  mesh.add(ink);
  return mesh;
}

export function createEnergyScene(host, opts = {}) {
  if (!hasDoc() || !webgl()) return null;
  opts.reduce = opts.reduce ?? reduced();
  const dark = isDark();
  let renderer;
  try { renderer = new THREE.WebGLRenderer({ antialias: true }); } catch { return null; }
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
  renderer.domElement.style.touchAction = "none";
  if (!document.getElementById("e3d-css")) { const st = document.createElement("style"); st.id = "e3d-css"; st.textContent = ".e3d-ui select,.e3d-ui button,.e3d-ui input,.e3d-ui option{font:inherit}"; document.head.appendChild(st); }
  host.appendChild(renderer.domElement);

  const scene = new THREE.Scene();
  scene.background = new THREE.Color(dark ? "#1F1D1A" : "#FBF6EA");
  const camera = new THREE.PerspectiveCamera(opts.fov || 40, 16 / 9, 0.1, 100);
  camera.position.fromArray(opts.camera || [0, 5, 9]);
  camera.lookAt(new THREE.Vector3().fromArray(opts.target || [0, 1, 0]));

  const sun = new THREE.DirectionalLight(0xFFF1DC, dark ? 1.8 : 2.2);
  sun.position.set(-4, 8, 5);
  sun.castShadow = true;
  sun.shadow.mapSize.set(2048, 2048);
  sun.shadow.bias = -0.0005;
  sun.shadow.normalBias = 0.02;
  Object.assign(sun.shadow.camera, { left: -6, right: 6, top: 6, bottom: -6, near: 0.5, far: 25 });
  scene.add(sun, new THREE.HemisphereLight(dark ? 0x3A362F : 0xFFF8EC, dark ? 0x1F1D1A : 0xD9CBB0, dark ? 0.45 : 0.6));

  const ground = new THREE.Mesh(new THREE.PlaneGeometry(60, 60), new THREE.MeshToonMaterial({ color: dark ? "#1F1D1A" : "#F4ECDC" }));
  ground.rotation.x = -Math.PI / 2;
  ground.receiveShadow = true;
  ground.userData.noFit = true;
  scene.add(ground);

  const frames = new Set(), drags = [], cleanups = [];
  const ray = new THREE.Raycaster(), ndc = new THREE.Vector2(), hit = new THREE.Vector3();
  const el = renderer.domElement;
  let active = null;
  const toNdc = (e) => {
    const r = el.getBoundingClientRect();
    ndc.set(((e.clientX - r.left) / r.width) * 2 - 1, -((e.clientY - r.top) / r.height) * 2 + 1);
    ray.setFromCamera(ndc, camera);
  };
  const AX = { x: new THREE.Vector3(1, 0, 0), y: new THREE.Vector3(0, 1, 0), z: new THREE.Vector3(0, 0, 1) };
  function down(e) {
    toNdc(e);
    const hits = ray.intersectObjects(drags.map((d) => d.mesh), true);
    if (!hits.length) return;
    const d = drags.find((d) => { let o = hits[0].object; while (o) { if (o === d.mesh) return true; o = o.parent; } return false; });
    if (!d) return;
    const axis = AX[d.axis] || AX.x;
    // plane containing the axis, facing the camera as much as possible
    const view = camera.getWorldDirection(new THREE.Vector3());
    const n = view.clone().sub(axis.clone().multiplyScalar(view.dot(axis)));
    if (n.lengthSq() < 1e-6) n.copy(axis.x ? AX.z : AX.x);
    const plane = new THREE.Plane().setFromNormalAndCoplanarPoint(n.normalize(), hits[0].point);
    if (!ray.ray.intersectPlane(plane, hit)) return;
    active = { d, plane, start: d.mesh.position[d.axis] - hit.dot(axis), axis };
    el.setPointerCapture?.(e.pointerId);
    e.preventDefault();
  }
  function move(e) {
    if (!active) return;
    toNdc(e);
    if (!ray.ray.intersectPlane(active.plane, hit)) return;
    const { d } = active;
    const v = clamp(active.start + hit.dot(active.axis), d.min, d.max);
    d.mesh.position[d.axis] = v;
    d.onMove?.(v, d.mesh);
  }
  const up = () => { active = null; };
  el.addEventListener("pointerdown", down);
  el.addEventListener("pointermove", move);
  el.addEventListener("pointerup", up);
  el.addEventListener("pointercancel", up);

  function addDrag(mesh, { axis = "x", min = -Infinity, max = Infinity, onMove } = {}) {
    const d = { mesh, axis, min, max, onMove };
    drags.push(d);
    return () => drags.splice(drags.indexOf(d), 1);
  }
  function onFrame(fn) { frames.add(fn); return () => frames.delete(fn); }
  function resize() {
    const w = host.clientWidth || 800, h = host.clientHeight || 450;
    renderer.setSize(w, h, false);
    el.style.width = "100%"; el.style.height = "100%";
    camera.aspect = w / h;
    camera.updateProjectionMatrix();
    if (fitted) fit();
  }
  // Frame everything the scene built (not the ground) for the current aspect, keeping the view direction.
  let fitted = false;
  const dir0 = new THREE.Vector3().fromArray(opts.camera || [0, 5, 9]).sub(new THREE.Vector3().fromArray(opts.target || [0, 1, 0])).normalize();
  function fit() {
    fitted = true;
    const box = new THREE.Box3();
    scene.traverse((o) => { if (o.isMesh && !o.userData.noFit && o.visible && o.parent?.visible !== false) box.expandByObject(o); });
    if (box.isEmpty()) return;
    const sph = box.getBoundingSphere(new THREE.Sphere());
    const v = THREE.MathUtils.degToRad(camera.fov), hz = 2 * Math.atan(Math.tan(v / 2) * camera.aspect);
    const d = (sph.radius * 1.05) / Math.sin(Math.min(v, hz) / 2);
    camera.position.copy(sph.center).addScaledVector(dir0, d);
    camera.lookAt(sph.center);
    // tighten: scale the distance so the projected box fills about 88% of the tighter screen axis
    const pts = [];
    for (const x of [box.min.x, box.max.x]) for (const y of [box.min.y, box.max.y]) for (const z of [box.min.z, box.max.z]) pts.push(new THREE.Vector3(x, y, z));
    const at = (dist) => {
      camera.position.copy(sph.center).addScaledVector(dir0, dist);
      camera.updateMatrixWorld(); camera.matrixWorldInverse.copy(camera.matrixWorld).invert();
      let m = 0; for (const p of pts) { const q = p.clone().project(camera); m = Math.max(m, Math.abs(q.x), Math.abs(q.y), q.z >= 1 ? 9 : 0); }
      return m <= 0.88;
    };
    let lo = d * 0.2, hi = d;
    for (let i = 0; i < 14; i++) { const mid = (lo + hi) / 2; if (at(mid)) hi = mid; else lo = mid; }
    at(hi);
  }
  resize();
  const ro = typeof ResizeObserver !== "undefined" ? new ResizeObserver(resize) : null;
  ro?.observe(host);

  let raf = 0, last = 0, disposed = false;
  function tick(t) {
    raf = 0;
    if (disposed || document.hidden) return;
    const dt = last ? Math.min((t - last) / 1000, 0.05) : 0;
    last = t;
    for (const fn of frames) fn(dt, t / 1000);
    if (!fitted) fit();
    renderer.render(scene, camera);
    raf = requestAnimationFrame(tick);
  }
  const vis = () => { if (!document.hidden && !raf && !disposed) { last = 0; raf = requestAnimationFrame(tick); } };
  document.addEventListener("visibilitychange", vis);
  raf = requestAnimationFrame(tick);

  function dispose() {
    disposed = true;
    if (raf) cancelAnimationFrame(raf);
    ro?.disconnect();
    document.removeEventListener("visibilitychange", vis);
    el.removeEventListener("pointerdown", down);
    el.removeEventListener("pointermove", move);
    el.removeEventListener("pointerup", up);
    el.removeEventListener("pointercancel", up);
    cleanups.forEach((f) => f());
    scene.traverse((o) => {
      o.geometry?.dispose();
      [].concat(o.material || []).forEach((m) => m.dispose());
    });
    renderer.dispose();
    el.remove();
    frames.clear();
    drags.length = 0;
  }
  return { THREE, scene, camera, renderer, palette, addDrag, onFrame, resize, fit, dispose };
}
