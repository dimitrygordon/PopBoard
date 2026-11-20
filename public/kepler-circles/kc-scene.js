import * as THREE from "../vendor/three/three.module.min.js";
import { GLTFLoader } from "../vendor/three/GLTFLoader.js";
import { MeshoptDecoder } from "../vendor/three/meshopt_decoder.mjs";
import { firstExisting, reducedMotion, ellipsePoints, emptyFocus } from "./kc-model.js";

const GREEN = 0x4caf50;
const GREY = 0xcccccc;

export async function createScene(canvas) {
  const scene = new THREE.Scene();
  scene.background = new THREE.Color(0x000000);
  const camera = new THREE.PerspectiveCamera(42, 1, 0.01, 8000);
  const renderer = new THREE.WebGLRenderer({ canvas, antialias: true });
  renderer.setPixelRatio(Math.min(devicePixelRatio || 1, 2));
  renderer.setClearColor(0x000000, 1);
  scene.add(new THREE.AmbientLight(0xffffff, 0.6));
  const key = new THREE.DirectionalLight(0xffffff, 0.7);
  key.position.set(3, 4, 6);
  scene.add(key);
  const root = new THREE.Group();
  scene.add(root);
  const stars = starfield();
  scene.add(stars);

  let running = true;
  let anim = null;
  const reduce = reducedMotion();
  const clock = new THREE.Clock();

  function resize() {
    const w = Math.max(1, canvas.clientWidth || canvas.parentElement?.clientWidth || innerWidth);
    const h = Math.max(1, canvas.clientHeight || canvas.parentElement?.clientHeight || innerHeight);
    renderer.setSize(w, h, false);
    camera.aspect = w / h;
    camera.updateProjectionMatrix();
  }
  resize();
  addEventListener("resize", resize);
  const ro = new ResizeObserver(resize);
  ro.observe(canvas.parentElement || canvas);
  setTimeout(resize, 0);
  setTimeout(resize, 200);
  (function loop() {
    if (!running) return;
    requestAnimationFrame(loop);
    const dt = Math.min(clock.getDelta(), 0.05);
    if (anim && !reduce) anim(dt);
    renderer.render(scene, camera);
  })();

  return {
    scene, camera, renderer, root,
    resize,
    clear() { root.clear(); anim = null; },
    setCamera(pos, look = [0, 0, 0]) {
      camera.position.set(...pos);
      camera.lookAt(...look);
    },
    addLine(points, color = GREEN, scale = 1) {
      const pos = [];
      for (const p of points) pos.push(p.x * scale, p.y * scale, (p.z || 0) * scale);
      const geo = new THREE.BufferGeometry();
      geo.setAttribute("position", new THREE.Float32BufferAttribute(pos, 3));
      const line = new THREE.Line(geo, new THREE.LineBasicMaterial({ color }));
      root.add(line);
      return line;
    },
    addDot(p, r, color = GREY, scale = 1) {
      const mesh = new THREE.Mesh(
        new THREE.SphereGeometry(r, 20, 16),
        new THREE.MeshStandardMaterial({ color, roughness: 0.6 })
      );
      mesh.position.set(p.x * scale, p.y * scale, (p.z || 0) * scale);
      root.add(mesh);
      return mesh;
    },
    addEmptyFocus(p, scale = 1) {
      const ring = new THREE.Mesh(
        new THREE.RingGeometry(0.18, 0.26, 32),
        new THREE.MeshBasicMaterial({ color: GREY, side: THREE.DoubleSide, transparent: true, opacity: 0.9 })
      );
      ring.position.set(p.x * scale, p.y * scale, 0);
      root.add(ring);
      return ring;
    },
    addArrow(from, to, color = GREEN) {
      const dir = new THREE.Vector3(to.x - from.x, to.y - from.y, (to.z || 0) - (from.z || 0));
      const len = dir.length();
      if (len < 1e-6) return null;
      dir.normalize();
      const arrow = new THREE.ArrowHelper(dir, new THREE.Vector3(from.x, from.y, from.z || 0), len, color, len * 0.28, len * 0.16);
      arrow.userData.kind = "arrow";
      root.add(arrow);
      return arrow;
    },
    onTick(fn) { anim = fn; },
    stopTick() { anim = null; },
    reduced: reduce,
    async trySkybox(urls) {
      const url = await firstExisting(urls);
      if (!url) return false;
      const tex = await new Promise((resolve) => {
        new THREE.TextureLoader().load(url, resolve, undefined, () => resolve(null));
      });
      if (!tex) return false;
      tex.mapping = THREE.EquirectangularReflectionMapping;
      tex.colorSpace = THREE.SRGBColorSpace;
      scene.background = tex;
      stars.visible = false;
      return true;
    },
    async tryGlb(urls) {
      const url = await firstExisting(urls);
      if (!url) return null;
      const loader = new GLTFLoader();
      if (MeshoptDecoder) {
        if (MeshoptDecoder.ready) await MeshoptDecoder.ready;
        loader.setMeshoptDecoder(MeshoptDecoder);
      }
      try {
        const res = await fetch(url);
        if (!res.ok) return null;
        const buf = await res.arrayBuffer();
        return await new Promise((resolve, reject) => loader.parse(buf, url.replace(/[^/]+$/, ""), resolve, reject));
      } catch (e) {
        return null;
      }
    },
    dispose() { running = false; ro.disconnect(); renderer.dispose(); }
  };
}

export function circlePoints(radius, steps = 128) {
  return ellipsePoints(radius, 0, steps);
}

export { ellipsePoints, emptyFocus };

function starfield() {
  const n = 500, pos = new Float32Array(n * 3);
  for (let i = 0; i < n; i++) {
    const r = 80 + Math.random() * 120;
    const th = Math.random() * Math.PI * 2;
    const ph = Math.acos(2 * Math.random() - 1);
    pos[i * 3] = r * Math.sin(ph) * Math.cos(th);
    pos[i * 3 + 1] = r * Math.sin(ph) * Math.sin(th);
    pos[i * 3 + 2] = r * Math.cos(ph);
  }
  const geo = new THREE.BufferGeometry();
  geo.setAttribute("position", new THREE.BufferAttribute(pos, 3));
  return new THREE.Points(geo, new THREE.PointsMaterial({ color: GREY, size: 0.2, transparent: true, opacity: 0.65 }));
}
