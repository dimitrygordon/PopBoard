import * as THREE from "../vendor/three/three.module.min.js";
import { firstExisting, reducedMotion, ellipsePoints, emptyFocus } from "./kc-model.js";
import { loadGlb, loadTexture, fitToSize, prepareComet, orientAxisToward } from "../gravity-orbits/go-load.js";
import {
  attachOrbitControls, setControlDistances, limitsForCameraDistance, applyControlFrame,
  prepareSkyboxTexture, dimSkybox, makeStarLayers, keplerPosition
} from "../gravity-orbits/go-view.js";

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
  const stars = makeStarLayers();
  scene.add(stars);

  let running = true;
  let anim = null;
  let lastCam = null;
  const reduce = reducedMotion();
  const clock = new THREE.Clock();
  const movers = [];
  const spinners = [];
  let keplerTime = 0;

  const controls = attachOrbitControls(camera, canvas, { minDistance: 1.5, maxDistance: 120 });

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

  function stepKepler(dt) {
    keplerTime += dt;
    for (const m of movers) {
      const p = keplerPosition(m.a, m.e, keplerTime + (m.t0 || 0), m.period, m.scale);
      m.obj.position.set(p.x, p.y, p.z);
      if (m.comet) {
        const away = new THREE.Vector3(p.x, p.y, p.z);
        if (away.lengthSq() > 1e-12) orientAxisToward(m.obj, new THREE.Vector3(1, 0, 0), away);
      }
    }
    for (const s of spinners) s.obj.rotation.y += s.rate * dt;
  }

  function stamp() {
    canvas.dataset.ready = "1";
    canvas.dataset.camX = String(camera.position.x);
    canvas.dataset.camY = String(camera.position.y);
    canvas.dataset.camZ = String(camera.position.z);
    globalThis.__keplerCircles = {
      ready: true,
      reduced: reduce,
      camera: { x: camera.position.x, y: camera.position.y, z: camera.position.z },
      target: { x: controls.target.x, y: controls.target.y, z: controls.target.z }
    };
  }

  function paint() { renderer.render(scene, camera); }
  let loopStarted = false;
  function startLoop() {
    if (loopStarted) return;
    loopStarted = true;
    clock.getDelta();
    (function loop() {
      if (!running) return;
      requestAnimationFrame(loop);
      const dt = Math.min(clock.getDelta(), 0.05);
      if (!reduce) stepKepler(dt);
      if (anim && !reduce) anim(dt);
      controls.update();
      stamp();
      paint();
    })();
  }
  paint();
  startLoop();

  function applyLastCam() {
    if (!lastCam) return;
    camera.up.set(0, 1, 0);
    camera.position.set(...lastCam.pos);
    const look = lastCam.look || [0, 0, 0];
    camera.lookAt(...look);
    const dist = camera.position.distanceTo(new THREE.Vector3(...look));
    const lim = limitsForCameraDistance(dist);
    setControlDistances(controls, lim.min, lim.max);
    applyControlFrame(controls, camera, look);
  }

  return {
    scene, camera, renderer, root, controls,
    resize, paint, startLoop,
    resetView() { applyLastCam(); },
    clear() {
      root.clear();
      anim = null;
      movers.length = 0;
      spinners.length = 0;
      keplerTime = 0;
    },
    setCamera(pos, look = [0, 0, 0]) {
      lastCam = { pos, look };
      applyLastCam();
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
    keplerOrbit(obj, { a, e = 0, scale = 1, period = 18, t0 = 0, comet = false } = {}) {
      movers.push({ obj, a, e, scale, period, t0, comet });
      const p = keplerPosition(a, e, t0, period, scale);
      obj.position.set(p.x, p.y, p.z);
      if (comet) {
        const away = new THREE.Vector3(p.x, p.y, p.z);
        if (away.lengthSq() > 1e-12) orientAxisToward(obj, new THREE.Vector3(1, 0, 0), away);
      }
      return obj;
    },
    spin(obj, rate = 0.08) {
      spinners.push({ obj, rate });
      return obj;
    },
    async trySkybox(urls) {
      const url = await firstExisting(urls);
      if (!url) return false;
      const tex = await loadTexture(url);
      if (!tex) return false;
      prepareSkyboxTexture(tex, renderer);
      dimSkybox(scene, tex, (typeof innerWidth === "number" && innerWidth <= 900) ? 0.24 : 0.42);
      stars.visible = true;
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
    dispose() { running = false; ro.disconnect(); controls.dispose(); renderer.dispose(); }
  };
}

export function circlePoints(radius, steps = 128) {
  return ellipsePoints(radius, 0, steps);
}

export { ellipsePoints, emptyFocus };
