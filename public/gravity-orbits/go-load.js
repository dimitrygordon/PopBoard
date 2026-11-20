import * as THREE from "../vendor/three/three.module.min.js";
import { GLTFLoader } from "../vendor/three/GLTFLoader.js";
import { MeshoptDecoder } from "../vendor/three/meshopt_decoder.mjs";
import { firstExisting } from "./go-assets.js";

export async function loadTexture(url) {
  return new Promise((resolve) => {
    new THREE.TextureLoader().load(url, resolve, undefined, () => resolve(null));
  });
}

export async function loadGlb(url) {
  const loader = new GLTFLoader();
  if (MeshoptDecoder) {
    if (MeshoptDecoder.ready) await MeshoptDecoder.ready;
    loader.setMeshoptDecoder(MeshoptDecoder);
  }
  let lastErr = null;
  for (let attempt = 0; attempt < 3; attempt++) {
    try {
      const res = await fetch(url);
      if (!res.ok) { lastErr = new Error(`HTTP ${res.status}`); continue; }
      const buf = await res.arrayBuffer();
      return await new Promise((resolve, reject) => loader.parse(buf, url.replace(/[^/]+$/, ""), resolve, reject));
    } catch (e) {
      lastErr = e;
      await new Promise((r) => setTimeout(r, 120 * (attempt + 1)));
    }
  }
  console.warn("glb failed", url, lastErr);
  return null;
}

export async function loadFirstGlb(urls) {
  const url = await firstExisting(urls);
  if (!url) return null;
  return loadGlb(url);
}

export function hideNamed(root, names) {
  const set = new Set(Array.isArray(names) ? names : [names]);
  root.traverse((o) => { if (set.has(o.name)) o.visible = false; });
}

export function prepareEarth(root) {
  // Rendering flags only. Do not replace maps or materials; later Earth updates keep these node names.
  root.traverse((o) => {
    if (!o.material) return;
    const mats = [].concat(o.material);
    if (o.name === "earth_clouds" || o.name === "earth_atmosphere") {
      for (const m of mats) {
        m.transparent = true;
        m.depthWrite = false;
      }
    }
  });
}

export function prepareComet(root, { showTail = false } = {}) {
  const tail = root.getObjectByName("dust_tail");
  if (tail) tail.visible = !!showTail;
}

function vec3(v) {
  if (!v) return new THREE.Vector3();
  if (v.isVector3) return v.clone();
  return new THREE.Vector3(v.x || 0, v.y || 0, v.z || 0);
}

export function orientAxisToward(obj, localAxis, worldDir) {
  const from = vec3(localAxis).normalize();
  const to = vec3(worldDir).normalize();
  if (to.lengthSq() < 1e-10) return;
  obj.quaternion.setFromUnitVectors(from, to);
}

export function prepareCannon(root) {
  hideNamed(root, ["earth_surface"]);
  // File has the mountain on +Z and the barrel along -X. Our paths launch from +X toward +Y.
  const qy = new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0, 1, 0), Math.PI / 2);
  const qx = new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(1, 0, 0), -Math.PI / 2);
  root.quaternion.copy(qx).multiply(qy);
  root.updateWorldMatrix(true, true);
  const pose = muzzlePose(root);
  // Nudge so the barrel lies in the XY (orbital) plane.
  const er = pose.position.clone().normalize();
  const dir = pose.direction.clone();
  const out = new THREE.Vector3().copy(dir).addScaledVector(er, -dir.dot(er));
  if (out.lengthSq() > 1e-10) {
    const target = new THREE.Vector3(-er.y, er.x, 0);
    if (target.lengthSq() < 1e-10) target.set(0, 1, 0);
    target.normalize();
    out.normalize();
    const align = new THREE.Quaternion().setFromUnitVectors(out, target);
    root.quaternion.premultiply(align);
    root.updateWorldMatrix(true, true);
  }
}

export function muzzlePose(root) {
  root.updateWorldMatrix(true, true);
  const muzzle = root.getObjectByName("cannon_muzzle");
  const cascabel = root.getObjectByName("cannon_cascabel");
  const p = new THREE.Vector3();
  const d = new THREE.Vector3(0, 1, 0);
  if (muzzle) {
    muzzle.getWorldPosition(p);
    if (cascabel) {
      const c = new THREE.Vector3();
      cascabel.getWorldPosition(c);
      d.copy(p).sub(c);
      if (d.lengthSq() > 1e-12) d.normalize();
    }
  }
  return { position: p, direction: d, radius: p.length() };
}

export function fitToSize(object, visualSize) {
  const box = new THREE.Box3().setFromObject(object);
  const size = new THREE.Vector3();
  box.getSize(size);
  const longest = Math.max(size.x, size.y, size.z, 1e-9);
  const s = visualSize / longest;
  object.scale.multiplyScalar(s);
  const mid = new THREE.Vector3();
  box.getCenter(mid);
  object.position.sub(mid.multiplyScalar(s));
  return s;
}

export { THREE };
