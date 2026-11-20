import * as THREE from "../vendor/three/three.module.min.js";
import { GLTFLoader } from "../vendor/three/GLTFLoader.js";
import { MeshoptDecoder } from "../vendor/three/meshopt_decoder.mjs";
import { firstExisting, reducedMotion } from "./ol-model.js";

const GREEN = 0x4caf50;
const GREY = 0xcccccc;

export async function createScene(canvas) {
  const scene = new THREE.Scene();
  scene.background = new THREE.Color(0x000000);
  const camera = new THREE.PerspectiveCamera(42, 1, 0.001, 5000);
  const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: false });
  renderer.setPixelRatio(Math.min(devicePixelRatio || 1, 2));
  renderer.setClearColor(0x000000, 1);
  const root = new THREE.Group();
  scene.add(root);
  const lights = new THREE.AmbientLight(0xffffff, 0.55);
  scene.add(lights);
  const key = new THREE.DirectionalLight(0xffffff, 0.8);
  key.position.set(4, 2, 6);
  scene.add(key);

  const earth = placeholderGlobe();
  earth.name = "earth";
  root.add(earth);
  const cannonMark = new THREE.Mesh(
    new THREE.ConeGeometry(0.012, 0.04, 10),
    new THREE.MeshBasicMaterial({ color: GREEN })
  );
  cannonMark.rotation.z = -Math.PI / 2;
  cannonMark.visible = false;
  root.add(cannonMark);
  const pathLine = makeLine();
  root.add(pathLine);
  const projectile = placeholderDot(0.02);
  projectile.name = "projectile";
  root.add(projectile);
  const satellites = new THREE.Group();
  satellites.name = "satellites";
  root.add(satellites);
  const stars = makeStarfield();
  scene.add(stars);

  const clock = new THREE.Clock();
  let anim = null;
  let running = true;
  const reduce = reducedMotion();

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

  function frame() {
    if (!running) return;
    requestAnimationFrame(frame);
    const dt = Math.min(clock.getDelta(), 0.05);
    if (anim && !reduce) anim(dt);
    renderer.render(scene, camera);
  }
  requestAnimationFrame(frame);

  return {
    scene, camera, renderer, root, earth, pathLine, projectile, satellites, stars,
    resize,
    setCannonVisible(on, radius = 1.001, scale = 1) {
      cannonMark.visible = !!on;
      cannonMark.position.set(radius, 0, 0.0);
      cannonMark.scale.setScalar(scale);
      projectile.scale.setScalar(Math.min(1, scale * 2));
    },
    setCamera(mode) {
      if (mode === "scale-wide") {
        camera.position.set(20, 18, 80);
        camera.lookAt(0, 0, 0);
      } else if (mode === "scale-iss") {
        // Whole Earth, slight 3/4 view, so the ISS ring sits just above the limb.
        camera.position.set(1.6, 1.1, 2.6);
        camera.lookAt(0, 0, 0);
      } else if (mode === "cannon-close") {
        // Side view of the limb, ~500 km across, so the 12 and 24 km lobs are visible.
        const r = 1.00125;
        camera.position.set(r + 0.01, 0.02, 0.09);
        camera.lookAt(r, 0.015, 0);
      } else {
        camera.position.set(0.4, 1.0, 3.5);
        camera.lookAt(0, 0, 0);
      }
    },
    setPath(points, R) {
      const pos = [];
      for (const p of points || []) pos.push(p.x / R, p.y / R, (p.z || 0) / R);
      pathLine.geometry.setAttribute("position", new THREE.Float32BufferAttribute(pos, 3));
      pathLine.geometry.computeBoundingSphere();
      pathLine.visible = pos.length >= 6;
    },
    setProjectileAt(p, R) {
      if (!p) { projectile.visible = false; return; }
      projectile.visible = true;
      projectile.position.set(p.x / R, p.y / R, (p.z || 0) / R);
    },
    playAlong(points, R, seconds, onDone) {
      if (!points?.length) return;
      if (reduce) {
        this.setPath(points, R);
        this.setProjectileAt(points[points.length - 1], R);
        onDone?.();
        return;
      }
      this.setPath(points, R);
      let t = 0;
      anim = (dt) => {
        t += dt;
        const u = Math.min(1, t / Math.max(0.35, seconds));
        const i = u * (points.length - 1);
        const i0 = Math.floor(i), i1 = Math.min(points.length - 1, i0 + 1), f = i - i0;
        const a = points[i0], b = points[i1];
        this.setProjectileAt({
          x: a.x + (b.x - a.x) * f,
          y: a.y + (b.y - a.y) * f,
          z: (a.z || 0) + ((b.z || 0) - (a.z || 0)) * f
        }, R);
        if (u >= 1) { anim = null; onDone?.(); }
      };
    },
    clearSatellites() { satellites.clear(); },
    addOrbitRing(rOverR, color = GREEN) {
      // Ring in the XY plane, same plane as the cannon paths.
      const inner = Math.max(0.001, rOverR - 0.01);
      const g = new THREE.RingGeometry(inner, rOverR + 0.01, 160);
      const m = new THREE.MeshBasicMaterial({ color, side: THREE.DoubleSide, transparent: true, opacity: 0.95 });
      const mesh = new THREE.Mesh(g, m);
      satellites.add(mesh);
      return mesh;
    },
    addBodyMarker(rOverR, label, color = GREY) {
      const dot = placeholderDot(0.03, color);
      dot.position.set(rOverR, 0, 0);
      satellites.add(dot);
      return dot;
    },
    async trySkybox(urls) {
      const url = await firstExisting(urls);
      if (!url) return false;
      const tex = await loadTexture(url);
      if (!tex) return false;
      tex.mapping = THREE.EquirectangularReflectionMapping;
      tex.colorSpace = THREE.SRGBColorSpace;
      scene.background = tex;
      stars.visible = false;
      return true;
    },
    async tryMesh(target, urls, scale = 1) {
      const url = await firstExisting(urls);
      if (!url) return false;
      const gltf = await loadGlb(url);
      if (!gltf) return false;
      const model = gltf.scene;
      model.scale.setScalar(scale);
      target.clear?.();
      if (target.isObject3D && target.geometry) {
        // replace placeholder globe in place
        const parent = target.parent;
        model.name = target.name;
        parent.remove(target);
        parent.add(model);
      } else {
        target.add(model);
      }
      return true;
    },
    dispose() {
      running = false;
      ro.disconnect();
      renderer.dispose();
    }
  };
}

function placeholderGlobe() {
  const g = new THREE.SphereGeometry(1, 48, 32);
  const m = new THREE.MeshStandardMaterial({ color: 0x2a2a2a, roughness: 0.85, metalness: 0, emissive: 0x111111 });
  const mesh = new THREE.Mesh(g, m);
  const wire = new THREE.LineSegments(
    new THREE.WireframeGeometry(new THREE.SphereGeometry(1.002, 20, 12)),
    new THREE.LineBasicMaterial({ color: GREEN, transparent: true, opacity: 0.55 })
  );
  mesh.add(wire);
  return mesh;
}

function placeholderDot(r, color = GREEN) {
  return new THREE.Mesh(
    new THREE.SphereGeometry(r, 16, 12),
    new THREE.MeshBasicMaterial({ color })
  );
}

function makeLine() {
  const geo = new THREE.BufferGeometry();
  geo.setAttribute("position", new THREE.Float32BufferAttribute([0, 0, 0, 0, 0, 0], 3));
  return new THREE.Line(geo, new THREE.LineBasicMaterial({ color: GREEN }));
}

function makeStarfield() {
  const n = 600;
  const pos = new Float32Array(n * 3);
  for (let i = 0; i < n; i++) {
    const r = 40 + Math.random() * 80;
    const th = Math.random() * Math.PI * 2;
    const ph = Math.acos(2 * Math.random() - 1);
    pos[i * 3] = r * Math.sin(ph) * Math.cos(th);
    pos[i * 3 + 1] = r * Math.sin(ph) * Math.sin(th);
    pos[i * 3 + 2] = r * Math.cos(ph);
  }
  const geo = new THREE.BufferGeometry();
  geo.setAttribute("position", new THREE.BufferAttribute(pos, 3));
  return new THREE.Points(geo, new THREE.PointsMaterial({ color: GREY, size: 0.12, sizeAttenuation: true, opacity: 0.7, transparent: true }));
}

async function loadTexture(url) {
  return new Promise((resolve) => {
    new THREE.TextureLoader().load(url, resolve, undefined, () => resolve(null));
  });
}

async function loadGlb(url) {
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
    console.warn("glb failed", url, e);
    return null;
  }
}
