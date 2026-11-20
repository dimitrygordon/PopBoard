import * as THREE from "../vendor/three/three.module.min.js";
import { firstExisting, reducedMotion, ellipsePoints, emptyFocus } from "./kc-model.js";
import { loadGlb, loadTexture, fitToSize, prepareComet, orientAxisToward } from "../gravity-orbits/go-load.js";

const GREEN = 0x4caf50;
const GREY = 0xcccccc;

export async function createScene(canvas) {
  const scene = new THREE.Scene();
  scene.background = new THREE.Color(0x000000);
  const camera = new THREE.PerspectiveCamera(42, 1, 0.01, 8000);
  const renderer = new THREE.WebGLRenderer({ canvas, antialias: true });
  renderer.setPixelRatio(Math.min(devicePixelRatio || 1, 2));
  renderer.setClearColor(0x000000, 1);
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  scene.add(new THREE.AmbientLight(0xffffff, 0.6));
  const key = new THREE.DirectionalLight(0xffffff, 1.05);
  key.position.set(3, 4, 6);
  scene.add(key);
  const fill = new THREE.PointLight(0xffffff, 0.8, 40);
  fill.position.set(0, 0, 6);
  scene.add(fill);
  const root = new THREE.Group();
  scene.add(root);
  const stars = starfield();
  scene.add(stars);

  let running = true;
  let anim = null;
  let lastCam = null;
  const reduce = reducedMotion();
  const clock = new THREE.Clock();

  function resize() {
    const w = Math.max(1, canvas.clientWidth || canvas.parentElement?.clientWidth || innerWidth);
    const h = Math.max(1, canvas.clientHeight || canvas.parentElement?.clientHeight || innerHeight);
    renderer.setSize(w, h, false);
    camera.aspect = w / h;
    camera.updateProjectionMatrix();
    if (lastCam) {
      camera.position.set(...lastCam.pos);
      camera.lookAt(...lastCam.look);
    }
  }
  resize();
  addEventListener("resize", resize);
  const ro = new ResizeObserver(resize);
  ro.observe(canvas.parentElement || canvas);
  setTimeout(resize, 0);
  setTimeout(resize, 200);
  let loopStarted = false;
  function paint() { renderer.render(scene, camera); }
  function startLoop() {
    if (loopStarted) return;
    loopStarted = true;
    clock.getDelta();
    (function loop() {
      if (!running) return;
      requestAnimationFrame(loop);
      const dt = Math.min(clock.getDelta(), 0.05);
      if (anim && !reduce) anim(dt);
      paint();
    })();
  }
  paint();
  startLoop();

  return {
    scene, camera, renderer, root,
    resize, paint, startLoop,
    clear() { root.clear(); anim = null; },
    setCamera(pos, look = [0, 0, 0]) {
      lastCam = { pos, look };
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
      paint();
      return line;
    },
    addDot(p, r, color = GREY, scale = 1) {
      const mesh = new THREE.Mesh(
        new THREE.SphereGeometry(r, 20, 16),
        new THREE.MeshStandardMaterial({ color, roughness: 0.6 })
      );
      mesh.position.set(p.x * scale, p.y * scale, (p.z || 0) * scale);
      root.add(mesh);
      paint();
      return mesh;
    },
    addEmptyFocus(p, scale = 1) {
      const ring = new THREE.Mesh(
        new THREE.RingGeometry(0.18, 0.26, 32),
        new THREE.MeshBasicMaterial({ color: GREY, side: THREE.DoubleSide, transparent: true, opacity: 0.9 })
      );
      ring.position.set(p.x * scale, p.y * scale, 0);
      root.add(ring);
      paint();
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
      paint();
      return arrow;
    },
    onTick(fn) { anim = fn; },
    stopTick() { anim = null; },
    reduced: reduce,
    async trySkybox(urls) {
      const url = await firstExisting(urls);
      if (!url) return false;
      const tex = await loadTexture(url);
      if (!tex) return false;
      tex.mapping = THREE.EquirectangularReflectionMapping;
      tex.colorSpace = THREE.SRGBColorSpace;
      scene.background = tex;
      stars.visible = false;
      paint();
      return true;
    },
    async tryGlb(urls) {
      const url = await firstExisting(urls);
      if (!url) return null;
      return loadGlb(url);
    },
    addModel(gltfScene, { p = { x: 0, y: 0, z: 0 }, visualSize, radius, scale = 1, comet = false } = {}) {
      const model = gltfScene;
      if (visualSize) fitToSize(model, visualSize);
      else if (radius != null) model.scale.setScalar(radius);
      if (comet) prepareComet(model, { showTail: false });
      model.position.set(p.x * scale, p.y * scale, (p.z || 0) * scale);
      if (comet) {
        // dust_tail is along +X; point +X away from the Sun at the origin.
        const away = new THREE.Vector3(model.position.x, model.position.y, model.position.z);
        if (away.lengthSq() > 1e-12) orientAxisToward(model, new THREE.Vector3(1, 0, 0), away);
      }
      root.add(model);
      paint();
      return model;
    },
    pointAxis(obj, localAxis, worldDir) {
      orientAxisToward(obj, localAxis, worldDir);
    },
    addDynamicLine(color = GREY) {
      const geo = new THREE.BufferGeometry();
      geo.setAttribute("position", new THREE.Float32BufferAttribute([0, 0, 0, 0, 0, 0], 3));
      const line = new THREE.Line(geo, new THREE.LineBasicMaterial({ color }));
      root.add(line);
      line.userData.setEnds = (a, b) => {
        const arr = line.geometry.attributes.position.array;
        arr[0] = a.x; arr[1] = a.y; arr[2] = a.z || 0;
        arr[3] = b.x; arr[4] = b.y; arr[5] = b.z || 0;
        line.geometry.attributes.position.needsUpdate = true;
        line.geometry.computeBoundingSphere();
      };
      return line;
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
