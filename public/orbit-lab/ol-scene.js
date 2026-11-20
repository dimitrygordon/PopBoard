import * as THREE from "../vendor/three/three.module.min.js";
import { firstExisting, reducedMotion } from "./ol-model.js";
import { loadGlb, loadTexture, prepareEarth, prepareCannon, muzzlePose, fitToSize } from "../gravity-orbits/go-load.js";

const GREEN = 0x4caf50;
const GREY = 0xcccccc;

export async function createScene(canvas) {
  const scene = new THREE.Scene();
  scene.background = new THREE.Color(0x000000);
  const camera = new THREE.PerspectiveCamera(42, 1, 0.001, 5000);
  const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: false });
  renderer.setPixelRatio(Math.min(devicePixelRatio || 1, 2));
  renderer.setClearColor(0x000000, 1);
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  const root = new THREE.Group();
  scene.add(root);
  scene.add(new THREE.AmbientLight(0xffffff, 0.32));
  const key = new THREE.DirectionalLight(0xffffff, 1.2);
  key.position.set(4, 1.4, 2.2);
  scene.add(key);
  const fill = new THREE.DirectionalLight(0x8899aa, 0.35);
  fill.position.set(-3, -0.8, -2);
  scene.add(fill);
  const rim = new THREE.DirectionalLight(0xffffff, 0.7);
  rim.position.set(0, 2, 10);
  scene.add(rim);

  const earthGroup = new THREE.Group();
  earthGroup.name = "earth";
  earthGroup.add(placeholderGlobe());
  root.add(earthGroup);

  const cannonGroup = new THREE.Group();
  cannonGroup.name = "cannon";
  const cannonMark = new THREE.Mesh(
    new THREE.ConeGeometry(0.012, 0.04, 10),
    new THREE.MeshBasicMaterial({ color: GREEN })
  );
  cannonMark.rotation.z = -Math.PI / 2;
  cannonMark.visible = false;
  cannonGroup.add(cannonMark);
  cannonGroup.visible = false;
  root.add(cannonGroup);

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
  let cannonLoaded = false;
  let earthLoaded = false;
  let skyboxLoaded = false;
  let cameraMode = null;

  function resize() {
    const w = Math.max(1, canvas.clientWidth || canvas.parentElement?.clientWidth || innerWidth);
    const h = Math.max(1, canvas.clientHeight || canvas.parentElement?.clientHeight || innerHeight);
    renderer.setSize(w, h, false);
    camera.aspect = w / h;
    camera.updateProjectionMatrix();
    if (cameraMode) applyCamera(cameraMode);
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

  function getMuzzle() {
    if (!cannonLoaded) {
      return { x: 1.00125, y: 0, z: 0, radius: 1.00125, direction: { x: 0, y: 1, z: 0 }, loaded: false };
    }
    const pose = muzzlePose(cannonGroup);
    const p = pose.position, d = pose.direction;
    return { x: p.x, y: p.y, z: p.z, radius: pose.radius || p.length(), direction: { x: d.x, y: d.y, z: d.z }, loaded: true };
  }

  function isNarrow() {
    const aspect = Math.max(0.2, camera.aspect || 1);
    return (typeof innerWidth === "number" && innerWidth <= 600) || aspect < 0.75;
  }

  // Pull back far enough that a radius fits in the visible band (HUD and controls excluded).
  function distanceToFit(radius, usableV, usableH) {
    const aspect = Math.max(0.2, camera.aspect || 1);
    const vFov = (camera.fov * Math.PI) / 180;
    const hFov = 2 * Math.atan(Math.tan(vFov / 2) * aspect);
    const halfV = Math.atan(Math.tan(vFov / 2) * usableV);
    const halfH = Math.atan(Math.tan(hFov / 2) * usableH);
    return radius / Math.min(Math.tan(halfV), Math.tan(halfH));
  }

  function applyCamera(mode) {
      camera.up.set(0, 1, 0);
      const narrow = isNarrow();
      if (mode === "scale-wide") {
        // Frame Earth at the origin and the Moon at ~60 R_E on +X.
        // Portrait: rotate so the 60 R_E gap runs along the long axis.
        if (narrow) {
          camera.up.set(1, 0, 0);
          camera.position.set(30, 0, 160);
          camera.lookAt(30, 0, 0);
        } else {
          camera.position.set(30, 8, 90);
          camera.lookAt(30, 0, 0);
        }
      } else if (mode === "scale-iss") {
        // Whole Earth, plus the ISS/Hubble ring and enlarged station, in the visible band.
        const dist = distanceToFit(1.25, narrow ? 0.40 : 0.62, 0.86);
        const dir = new THREE.Vector3(0.55, 0.38, 1).normalize();
        camera.position.copy(dir.multiplyScalar(dist));
        camera.lookAt(0, narrow ? -0.45 : -0.12, 0);
      } else if (mode === "cannon-close") {
        const m = getMuzzle();
        const origin = new THREE.Vector3(m.x, m.y, m.z);
        const dir = new THREE.Vector3(m.direction.x, m.direction.y, m.direction.z);
        if (dir.lengthSq() < 1e-8) dir.set(0, 1, 0);
        dir.normalize();
        const radial = origin.lengthSq() > 1e-8 ? origin.clone().normalize() : new THREE.Vector3(1, 0, 0);
        let side = new THREE.Vector3().crossVectors(dir, radial);
        if (side.lengthSq() < 1e-8) side.set(0, 0, 1);
        side.normalize();
        // Narrow: side view of the muzzle, already sitting above the controls.
        // Landscape: look toward the mountain body, not up the barrel, so the
        // cannon stays in the open band above the control panel.
        const sideD = narrow ? 0.9 : 1.05;
        const radD = narrow ? 0.42 : 0.32;
        camera.position.copy(origin).addScaledVector(side, sideD).addScaledVector(radial, radD).addScaledVector(dir, narrow ? -0.06 : 0.05);
        camera.lookAt(origin.clone().addScaledVector(dir, narrow ? 0.14 : -0.22).addScaledVector(radial, narrow ? -0.1 : -0.04));
      } else {
        // Three-quarter view that keeps the not-to-scale mountain on the limb, above the controls.
        const dist = distanceToFit(1.45, narrow ? 0.40 : 0.64, 0.88);
        const dir = new THREE.Vector3(0.7, 0.4, 1).normalize();
        camera.position.copy(dir.multiplyScalar(dist));
        camera.lookAt(0.35, narrow ? -0.4 : -0.05, 0);
      }
  }

  const api = {
    scene, camera, renderer, root, earth: earthGroup, pathLine, projectile, satellites, stars,
    resize,
    get loaded() { return { earth: earthLoaded, cannon: cannonLoaded, skybox: skyboxLoaded }; },
    getMuzzle,
    setCannonVisible(on, radius = 1.001, scale = 1) {
      cannonGroup.visible = !!on;
      if (!cannonLoaded) {
        cannonMark.visible = !!on;
        cannonMark.position.set(radius, 0, 0);
        cannonMark.scale.setScalar(scale);
      } else {
        cannonMark.visible = false;
      }
      projectile.scale.setScalar(on && scale < 1 ? 0.15 : (cannonLoaded && on ? 0.25 : 1));
    },
    setCamera(mode) {
      cameraMode = mode;
      applyCamera(mode);
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
      skyboxLoaded = true;
      return true;
    },
    async tryEarth(urls) {
      const url = await firstExisting(urls);
      if (!url) return false;
      const gltf = await loadGlb(url);
      if (!gltf) return false;
      const model = gltf.scene;
      prepareEarth(model);
      earthGroup.clear();
      earthGroup.add(model);
      earthLoaded = true;
      return true;
    },
    async tryCannon(urls) {
      const url = await firstExisting(urls);
      if (!url) return false;
      const gltf = await loadGlb(url);
      if (!gltf) return false;
      const model = gltf.scene;
      prepareCannon(model);
      cannonGroup.clear();
      cannonGroup.add(model);
      cannonLoaded = true;
      return true;
    },
    async addCraft(urls, rOverR, visualSize = 0.055) {
      const group = new THREE.Group();
      group.position.set(rOverR, 0, 0);
      const url = await firstExisting(urls);
      if (url) {
        const gltf = await loadGlb(url);
        if (gltf) {
          const model = gltf.scene;
          fitToSize(model, visualSize);
          group.add(model);
          satellites.add(group);
          return group;
        }
      }
      const fallback = placeholderDot(visualSize * 0.5, GREEN);
      group.add(fallback);
      satellites.add(group);
      return group;
    },
    async addMoon(urls, rOverR, radiusScale) {
      const group = new THREE.Group();
      group.position.set(rOverR, 0, 0);
      const url = await firstExisting(urls);
      if (url) {
        const gltf = await loadGlb(url);
        if (gltf) {
          const model = gltf.scene;
          model.scale.setScalar(radiusScale);
          group.add(model);
          satellites.add(group);
          return group;
        }
      }
      const fallback = placeholderDot(radiusScale, GREY);
      group.add(fallback);
      satellites.add(group);
      return group;
    },
    dispose() {
      running = false;
      ro.disconnect();
      renderer.dispose();
    }
  };
  return api;
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
