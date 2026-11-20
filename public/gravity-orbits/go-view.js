import * as THREE from "../vendor/three/three.module.min.js";
import { OrbitControls } from "../vendor/three/OrbitControls.js";

export function attachOrbitControls(camera, dom, { minDistance = 0.4, maxDistance = 200 } = {}) {
  const controls = new OrbitControls(camera, dom);
  controls.enableDamping = true;
  controls.dampingFactor = 0.08;
  controls.enablePan = true;
  controls.enableZoom = true;
  controls.enableRotate = true;
  controls.screenSpacePanning = true;
  controls.rotateSpeed = 0.85;
  controls.zoomSpeed = 0.9;
  controls.panSpeed = 0.7;
  controls.minDistance = minDistance;
  controls.maxDistance = maxDistance;
  controls.touches.ONE = THREE.TOUCH.ROTATE;
  controls.touches.TWO = THREE.TOUCH.DOLLY_PAN;
  controls.listenToKeyEvents?.(window);
  return controls;
}

export function setControlDistances(controls, minDistance, maxDistance) {
  if (!controls) return;
  controls.minDistance = minDistance;
  controls.maxDistance = maxDistance;
}

export function limitsForMode(mode) {
  if (mode === "cannon-close") return { min: 0.15, max: 6 };
  if (mode === "lob-arc") return { min: 0.04, max: 8 };
  if (mode === "cannon-wide") return { min: 1.2, max: 24 };
  if (mode === "scale-iss") return { min: 1.6, max: 28 };
  if (mode === "scale-wide") return { min: 16, max: 420 };
  return { min: 0.4, max: 200 };
}

export function limitsForCameraDistance(dist) {
  const d = Math.max(0.4, Number(dist) || 8);
  return { min: d * 0.22, max: d * 8 };
}

export function applyControlFrame(controls, camera, target) {
  if (!controls) return;
  const t = target;
  if (t?.isVector3) controls.target.copy(t);
  else if (Array.isArray(t)) controls.target.set(t[0] || 0, t[1] || 0, t[2] || 0);
  else if (t) controls.target.set(t.x || 0, t.y || 0, t.z || 0);
  controls.update();
  camera.updateProjectionMatrix();
}

export function lowMemorySkybox() {
  const mem = typeof navigator !== "undefined" ? Number(navigator.deviceMemory) : NaN;
  return Number.isFinite(mem) && mem > 0 && mem <= 2;
}

export function prepareSkyboxTexture(tex, renderer) {
  tex.mapping = THREE.EquirectangularReflectionMapping;
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.generateMipmaps = true;
  tex.minFilter = THREE.LinearMipmapLinearFilter;
  tex.magFilter = THREE.LinearFilter;
  const maxA = renderer?.capabilities?.getMaxAnisotropy?.() || 1;
  tex.anisotropy = maxA;
  tex.needsUpdate = true;
  return tex;
}

export function dimSkybox(scene, tex, intensity = 0.42) {
  scene.background = tex;
  if ("backgroundIntensity" in scene) scene.backgroundIntensity = intensity;
}

export function makeRoundStarSprite() {
  const size = 64;
  const canvas = document.createElement("canvas");
  canvas.width = canvas.height = size;
  const ctx = canvas.getContext("2d");
  const g = ctx.createRadialGradient(size / 2, size / 2, 0, size / 2, size / 2, size / 2);
  g.addColorStop(0, "rgba(255,255,255,1)");
  g.addColorStop(0.28, "rgba(255,255,255,0.85)");
  g.addColorStop(0.55, "rgba(220,230,255,0.25)");
  g.addColorStop(1, "rgba(255,255,255,0)");
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, size, size);
  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.needsUpdate = true;
  return tex;
}

export function makePointStars({ count = 2200, radius = 400, sizePx = 1.7, seed = 1 } = {}) {
  const pos = new Float32Array(count * 3);
  let s = seed >>> 0 || 1;
  const rand = () => {
    s = (s * 1664525 + 1013904223) >>> 0;
    return s / 4294967296;
  };
  for (let i = 0; i < count; i++) {
    const r = radius * (0.86 + rand() * 0.14);
    const th = rand() * Math.PI * 2;
    const ph = Math.acos(2 * rand() - 1);
    pos[i * 3] = r * Math.sin(ph) * Math.cos(th);
    pos[i * 3 + 1] = r * Math.sin(ph) * Math.sin(th);
    pos[i * 3 + 2] = r * Math.cos(ph);
  }
  const geo = new THREE.BufferGeometry();
  geo.setAttribute("position", new THREE.BufferAttribute(pos, 3));
  const mat = new THREE.PointsMaterial({
    color: 0xffffff,
    map: makeRoundStarSprite(),
    size: sizePx,
    sizeAttenuation: false,
    transparent: true,
    depthWrite: false,
    blending: THREE.AdditiveBlending,
    opacity: 0.95
  });
  const points = new THREE.Points(geo, mat);
  points.frustumCulled = false;
  points.name = "point-stars";
  return points;
}

export function makeStarLayers() {
  const group = new THREE.Group();
  group.name = "stars";
  group.add(makePointStars({ count: 2600, radius: 420, sizePx: 1.45, seed: 7 }));
  group.add(makePointStars({ count: 520, radius: 400, sizePx: 2.2, seed: 19 }));
  return group;
}

export { keplerAnomaly, keplerPosition, visualKeplerPeriod, visualSatPeriod } from "./go-orbit.js";
