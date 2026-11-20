import * as THREE from "../vendor/three/three.module.min.js";
import { firstExisting, reducedMotion } from "./ol-model.js";
import { loadGlb, loadTexture, prepareEarth, prepareCannon, muzzlePose, fitToSize } from "../gravity-orbits/go-load.js";
import {
  attachOrbitControls, setControlDistances, limitsForMode, applyControlFrame,
  prepareSkyboxTexture, dimSkybox, makeStarLayers, visualSatPeriod
} from "../gravity-orbits/go-view.js";

const GREEN = 0x4caf50;
const GREY = 0xcccccc;
const BALL = 0xf6f1c8;

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

  const pathLine = makeLine(GREEN, 0.9);
  root.add(pathLine);
  const trailLine = makeLine(0xe7ff9a, 1);
  trailLine.visible = false;
  root.add(trailLine);
  const pathHistory = new THREE.Group();
  pathHistory.name = "path-history";
  root.add(pathHistory);
  const projectile = makeCannonball();
  projectile.name = "projectile";
  projectile.visible = false;
  root.add(projectile);
  const impact = makeImpact();
  impact.visible = false;
  root.add(impact);
  const satellites = new THREE.Group();
  satellites.name = "satellites";
  root.add(satellites);
  const stars = makeStarLayers();
  scene.add(stars);

  const clock = new THREE.Clock();
  let anim = null;
  let running = true;
  const reduce = reducedMotion();
  let cannonLoaded = false;
  let earthLoaded = false;
  let skyboxLoaded = false;
  let cameraMode = null;
  let homeMode = "cannon-wide";
  let cameraFit = 1.25;
  let clouds = null;
  let flying = false;
  let earthHeld = false;
  let camFly = null;
  let cannonScale = 1;
  const trailPts = [];
  const satPivots = [];
  const framedShotPoints = [];

  const controls = attachOrbitControls(camera, canvas, limitsForMode("cannon-wide"));

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

  function spinSatellites(dt) {
    for (const pivot of satPivots) {
      pivot.rotation.z += (pivot.userData.orbitRate || 0) * dt;
    }
  }

  function spinEarth(dt) {
    earthGroup.rotation.y += dt * 0.05;
    if (clouds) clouds.rotation.y += dt * 0.025;
  }

  function stamp() {
    canvas.dataset.ready = "1";
    canvas.dataset.camX = String(camera.position.x);
    canvas.dataset.camY = String(camera.position.y);
    canvas.dataset.camZ = String(camera.position.z);
    canvas.dataset.projX = String(projectile.position.x);
    canvas.dataset.projY = String(projectile.position.y);
    canvas.dataset.projZ = String(projectile.position.z);
    canvas.dataset.flying = flying ? "1" : "0";
    canvas.dataset.shotCam = earthHeld ? "lob" : "globe";
    const dbg = {
      ready: true,
      reduced: reduce,
      loaded: { earth: earthLoaded, cannon: cannonLoaded, skybox: skyboxLoaded },
      camera: { x: camera.position.x, y: camera.position.y, z: camera.position.z },
      target: { x: controls.target.x, y: controls.target.y, z: controls.target.z },
      projectile: {
        x: projectile.position.x,
        y: projectile.position.y,
        z: projectile.position.z,
        visible: projectile.visible,
        flying
      },
      shotCam: earthHeld ? "lob" : "globe",
      pathHistory: pathHistory.children.length
    };
    globalThis.__orbitLab = dbg;
  }

  function frame() {
    if (!running) return;
    requestAnimationFrame(frame);
    const dt = Math.min(clock.getDelta(), 0.05);
    if (camFly) camFly(dt);
    if (!reduce && !earthHeld) {
      spinEarth(dt);
      spinSatellites(dt);
    }
    if (anim && !reduce) anim(dt);
    if (!camFly) controls.update();
    stamp();
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

  function distanceToFit(radius, usableV, usableH) {
    const aspect = Math.max(0.2, camera.aspect || 1);
    const vFov = (camera.fov * Math.PI) / 180;
    const hFov = 2 * Math.atan(Math.tan(vFov / 2) * aspect);
    const halfV = Math.atan(Math.tan(vFov / 2) * usableV);
    const halfH = Math.atan(Math.tan(hFov / 2) * usableH);
    return radius / Math.min(Math.tan(halfV), Math.tan(halfH));
  }


  function applyPose(pos, target, limits, up) {
    if (up) camera.up.copy(up);
    else camera.up.set(0, 1, 0);
    camera.position.copy(pos);
    camera.lookAt(target);
    if (limits) setControlDistances(controls, limits.min, limits.max);
    applyControlFrame(controls, camera, target);
  }

  function flyTo(pos, target, limits, seconds, up) {
    const destP = pos.clone();
    const destT = target.clone();
    const destUp = (up || new THREE.Vector3(0, 1, 0)).clone();
    if (reduce || !seconds) {
      camFly = null;
      applyPose(destP, destT, limits, destUp);
      controls.enabled = true;
      return;
    }
    const fromP = camera.position.clone();
    const fromT = controls.target.clone();
    const fromUp = camera.up.clone();
    let t = 0;
    controls.enabled = false;
    camFly = (dt) => {
      t += dt;
      const u = Math.min(1, t / Math.max(0.15, seconds));
      const s = u * u * (3 - 2 * u);
      camera.position.lerpVectors(fromP, destP, s);
      controls.target.lerpVectors(fromT, destT, s);
      camera.up.lerpVectors(fromUp, destUp, s).normalize();
      camera.lookAt(controls.target);
      if (u >= 1) {
        camFly = null;
        applyPose(destP, destT, limits, destUp);
        controls.enabled = true;
      }
    };
  }

  function cannonMinRadius() {
    // Ignore hidden earth_surface in the cannon GLB; it would make the mountain look already planted.
    let minR = Infinity;
    const box = new THREE.Box3();
    const corner = new THREE.Vector3();
    cannonGroup.updateMatrixWorld(true);
    cannonGroup.traverse((o) => {
      if (!o.isMesh || !o.geometry) return;
      let vis = o;
      while (vis) {
        if (vis.visible === false || vis.name === "earth_surface") return;
        vis = vis.parent;
      }
      if (!o.geometry.boundingBox) o.geometry.computeBoundingBox();
      box.copy(o.geometry.boundingBox).applyMatrix4(o.matrixWorld);
      const min = box.min, max = box.max;
      const xs = [min.x, max.x], ys = [min.y, max.y], zs = [min.z, max.z];
      for (const x of xs) for (const y of ys) for (const z of zs) {
        corner.set(x, y, z);
        minR = Math.min(minR, corner.length());
      }
    });
    return minR;
  }

  function setCannonScale(s, opts = {}) {
    s = Math.max(0.05, Number(s) || 1);
    if (!cannonLoaded) {
      cannonGroup.scale.setScalar(s);
      cannonScale = s;
      return s;
    }
    cannonGroup.position.set(0, 0, 0);
    cannonGroup.scale.setScalar(1);
    cannonGroup.updateMatrixWorld(true);
    const raw = muzzlePose(cannonGroup).position.clone();
    cannonGroup.scale.setScalar(s);
    cannonGroup.position.copy(raw).multiplyScalar(1 - s);
    cannonGroup.updateMatrixWorld(true);
    // After shrinking about the muzzle, plant the mountain on Earth's surface
    // so the close-up is at the surface instead of floating at the old peak.
    if (opts.seat !== false && s < 0.999) {
      const minR = cannonMinRadius();
      if (Number.isFinite(minR) && minR > 1.002) {
        const radial = raw.lengthSq() > 1e-8 ? raw.clone().normalize() : new THREE.Vector3(1, 0, 0);
        cannonGroup.position.addScaledVector(radial, 1 - minR);
        cannonGroup.updateMatrixWorld(true);
      }
    }
    cannonScale = s;
    return s;
  }

  function archiveCurrentPath() {
    if (pathLine.visible && pathLine.geometry?.attributes?.position?.count >= 2) {
      const line = new THREE.Line(
        pathLine.geometry.clone(),
        new THREE.LineBasicMaterial({ color: 0x6e9e6e, transparent: true, opacity: 0.7 })
      );
      pathHistory.add(line);
    }
    if (trailLine.visible && trailPts.length >= 6) {
      const geo = new THREE.BufferGeometry();
      geo.setAttribute("position", new THREE.Float32BufferAttribute(trailPts.slice(), 3));
      const line = new THREE.Line(geo, new THREE.LineBasicMaterial({ color: 0xb8e8b0, transparent: true, opacity: 0.85 }));
      pathHistory.add(line);
    }
    while (pathHistory.children.length > 6) {
      const c = pathHistory.children[0];
      pathHistory.remove(c);
      c.geometry?.dispose();
    }
  }

  function clearPathHistory() {
    while (pathHistory.children.length) {
      const c = pathHistory.children[0];
      pathHistory.remove(c);
      c.geometry?.dispose();
    }
    framedShotPoints.length = 0;
  }

  function pointsToVecs(points, R) {
    const out = [];
    for (const p of points || []) out.push(new THREE.Vector3(p.x / R, p.y / R, (p.z || 0) / R));
    return out;
  }

  function lobPose(points, R, extraPoints) {
    const pathPts = pointsToVecs(points, R);
    const pts = pathPts.concat(pointsToVecs(extraPoints, R));
    if (!pts.length) return null;
    const start = pathPts[0] || pts[0];
    const centroid = new THREE.Vector3();
    for (const p of pts) centroid.add(p);
    centroid.multiplyScalar(1 / pts.length);
    let pathSpan = 0;
    for (const p of pts) pathSpan = Math.max(pathSpan, p.distanceTo(centroid));
    const radial = (start.lengthSq() > 1e-8 ? start : centroid).clone().normalize();
    const along = new THREE.Vector3();
    for (const p of pts) {
      const d = p.clone().sub(start);
      d.addScaledVector(radial, -d.dot(radial));
      along.add(d);
    }
    if (along.lengthSq() < 1e-10) along.set(-radial.y, radial.x, 0);
    if (along.lengthSq() < 1e-10) along.set(0, 1, 0);
    along.normalize();
    let side = new THREE.Vector3().crossVectors(along, radial);
    if (side.lengthSq() < 1e-8) side.crossVectors(along, new THREE.Vector3(0, 0, 1));
    if (side.lengthSq() < 1e-8) side.set(0, 0, 1);
    side.normalize();
    // Prefer the same side the globe view already uses, so the fly-in is short.
    if (side.dot(camera.position) < 0) side.multiplyScalar(-1);
    const target = centroid.clone().addScaledVector(radial, -Math.max(0.025, pathSpan * 0.3));
    if (target.length() < 0.9) target.normalize().multiplyScalar(0.9);
    let span = 0;
    for (const p of pts) span = Math.max(span, p.distanceTo(target));
    for (const p of pts) span = Math.max(span, p.clone().normalize().distanceTo(target) * 0.7);
    span = Math.max(span, pathSpan, 0.055);
    const narrow = isNarrow();
    const fitR = Math.max(span * 1.4, narrow ? 0.09 : 0.08);
    const dist = Math.max(distanceToFit(fitR, narrow ? 0.38 : 0.54, 0.88), fitR * 2.3);
    const elev = (narrow ? 36 : 32) * Math.PI / 180;
    const pos = target.clone()
      .addScaledVector(side, dist * Math.cos(elev))
      .addScaledVector(radial, dist * Math.sin(elev));
    if (pos.length() < 1.2) pos.normalize().multiplyScalar(1.2);
    const limits = { min: Math.max(0.08, dist * 0.2), max: Math.max(8, dist * 8) };
    return { pos, target, limits, span: pathSpan, up: radial.clone() };
  }

  function applyCamera(mode) {
      camera.up.set(0, 1, 0);
      const narrow = isNarrow();
      const target = new THREE.Vector3();
      if (mode === "scale-wide") {
        if (narrow) {
          camera.up.set(1, 0, 0);
          camera.position.set(30, 0, 160);
          target.set(30, 0, 0);
        } else {
          camera.position.set(30, 8, 90);
          target.set(30, 0, 0);
        }
      } else if (mode === "scale-iss" || mode === "scale-fit") {
        const rad = mode === "scale-fit" ? Math.max(1.25, cameraFit) : 1.25;
        const dist = distanceToFit(rad, narrow ? 0.40 : 0.62, 0.86);
        const dir = new THREE.Vector3(0.55, 0.38, 1).normalize();
        camera.position.copy(dir.multiplyScalar(dist));
        target.set(0, narrow ? -0.45 : -0.12, 0);
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
        const sideD = narrow ? 0.9 : 1.05;
        const radD = narrow ? 0.42 : 0.32;
        camera.position.copy(origin).addScaledVector(side, sideD).addScaledVector(radial, radD).addScaledVector(dir, narrow ? -0.06 : 0.05);
        target.copy(origin).addScaledVector(dir, narrow ? 0.14 : -0.22).addScaledVector(radial, narrow ? -0.1 : -0.04);
      } else {
        const dist = distanceToFit(1.45, narrow ? 0.40 : 0.64, 0.88);
        const dir = new THREE.Vector3(0.7, 0.4, 1).normalize();
        camera.position.copy(dir.multiplyScalar(dist));
        target.set(0.35, narrow ? -0.4 : -0.05, 0);
      }
      camera.lookAt(target);
      let lim = limitsForMode(mode);
      if (mode === "scale-fit") {
        const d = camera.position.distanceTo(target);
        lim = { min: Math.max(1.6, d * 0.25), max: Math.max(28, d * 6) };
      }
      setControlDistances(controls, lim.min, lim.max);
      applyControlFrame(controls, camera, target);
  }

  function setPathLine(line, points, R) {
    const pos = [];
    for (const p of points || []) pos.push(p.x / R, p.y / R, (p.z || 0) / R);
    line.geometry.setAttribute("position", new THREE.Float32BufferAttribute(pos, 3));
    line.geometry.computeBoundingSphere();
    line.visible = pos.length >= 6;
  }

  function clearTrail() {
    trailPts.length = 0;
    trailLine.visible = false;
  }

  function pushTrail(p, R) {
    trailPts.push(p.x / R, p.y / R, (p.z || 0) / R);
    trailLine.geometry.setAttribute("position", new THREE.Float32BufferAttribute(trailPts.slice(), 3));
    trailLine.geometry.computeBoundingSphere();
    trailLine.visible = trailPts.length >= 6;
  }

  function placeImpact(p, R) {
    if (!p) { impact.visible = false; return; }
    const x = p.x / R, y = p.y / R, z = (p.z || 0) / R;
    impact.position.set(x, y, z);
    const n = new THREE.Vector3(x, y, z);
    if (n.lengthSq() > 1e-8) {
      n.normalize();
      impact.quaternion.setFromUnitVectors(new THREE.Vector3(0, 0, 1), n);
    }
    impact.visible = true;
  }

  function attachOrbit(obj, rOverR, phase = 0) {
    const pivot = new THREE.Group();
    pivot.userData.orbitRate = (Math.PI * 2) / visualSatPeriod(rOverR);
    pivot.rotation.z = phase;
    obj.position.set(rOverR, 0, 0);
    pivot.add(obj);
    satellites.add(pivot);
    satPivots.push(pivot);
    return pivot;
  }

  const api = {
    scene, camera, renderer, root, earth: earthGroup, pathLine, projectile, satellites, stars, controls,
    resize,
    get loaded() { return { earth: earthLoaded, cannon: cannonLoaded, skybox: skyboxLoaded }; },
    getMuzzle,
    resetView() {
      this.flyHome(0.7);
    },
    setHomeCamera(mode, fitRadius) {
      homeMode = mode;
      if (fitRadius) cameraFit = fitRadius;
      cameraMode = mode;
      earthHeld = false;
      setCannonScale(1);
      applyCamera(mode);
    },
    flyHome(seconds = 0.7) {
      earthHeld = false;
      setCannonScale(1);
      const mode = homeMode || "cannon-wide";
      cameraMode = mode;
      const fromP = camera.position.clone();
      const fromT = controls.target.clone();
      applyCamera(mode);
      const toP = camera.position.clone();
      const toT = controls.target.clone();
      const up = camera.up.clone();
      const limits = limitsForMode(mode);
      // Put the camera back and fly, so the jump is not visible.
      camera.position.copy(fromP);
      applyControlFrame(controls, camera, fromT);
      flyTo(toP, toT, limits, reduce ? 0 : seconds, up);
    },
    frameShot(points, R, opts = {}) {
      const extras = opts.extras || framedShotPoints;
      const pose = lobPose(points, R, extras);
      if (!pose) return null;
      cameraMode = "lob-arc";
      earthHeld = true;
      if (opts.cannonScale !== false) {
        const scale = opts.cannonScale ?? Math.max(0.1, Math.min(0.28, pose.span * 2.2));
        setCannonScale(scale);
      }
      projectile.scale.setScalar(1);
      flyTo(pose.pos, pose.target, pose.limits, reduce ? 0 : (opts.seconds ?? 0.65), pose.up);
      if (opts.keepPrevious) {
        for (const p of points || []) framedShotPoints.push(p);
      }
      canvas.dataset.shotCam = "lob";
      return pose;
    },
    setCannonScale,
    archiveCurrentPath,
    clearPathHistory,
    get framedPoints() { return framedShotPoints.slice(); },
    setCannonVisible(on, radius = 1.001, scale = 1) {
      cannonGroup.visible = !!on;
      if (!cannonLoaded) {
        cannonMark.visible = !!on;
        cannonMark.position.set(radius, 0, 0);
        cannonMark.scale.setScalar(scale);
      } else {
        cannonMark.visible = false;
      }
      // Keep the ball large enough to read next to the (not-to-scale) cannon.
      projectile.scale.setScalar(on ? (scale < 1 && !cannonLoaded ? 0.85 : 1) : 1);
    },
    setCamera(mode, fitRadius) {
      cameraMode = mode;
      if (fitRadius) cameraFit = fitRadius;
      if (mode !== "lob-arc") homeMode = mode;
      earthHeld = (mode === "lob-arc");
      if (mode !== "lob-arc") setCannonScale(1);
      applyCamera(mode);
    },
    setPath(points, R) {
      setPathLine(pathLine, points, R);
    },
    setProjectileAt(p, R) {
      if (!p) { projectile.visible = false; return; }
      projectile.visible = true;
      projectile.position.set(p.x / R, p.y / R, (p.z || 0) / R);
    },
    playAlong(points, R, seconds, opts = {}) {
      if (!points?.length) return;
      const loop = !!opts.loop;
      const wantImpact = opts.impact !== false && !loop;
      if (opts.keepPrevious) {
        archiveCurrentPath();
        if (impact.visible) pathHistory.add(impact.clone());
      } else {
        clearPathHistory();
      }
      impact.visible = false;
      clearTrail();
      this.setProjectileAt(points[0], R);
      pushTrail(points[0], R);
      if (reduce) {
        if (!loop) {
          this.setProjectileAt(points[points.length - 1], R);
          if (wantImpact) placeImpact(points[points.length - 1], R);
        }
        flying = false;
        opts.onDone?.();
        return;
      }
      let t = 0;
      flying = true;
      anim = (dt) => {
        t += dt;
        let u = t / Math.max(0.35, seconds);
        if (loop) u = u % 1;
        else u = Math.min(1, u);
        const i = u * (points.length - 1);
        const i0 = Math.floor(i), i1 = Math.min(points.length - 1, i0 + 1), f = i - i0;
        const a = points[i0], b = points[i1];
        const p = {
          x: a.x + (b.x - a.x) * f,
          y: a.y + (b.y - a.y) * f,
          z: (a.z || 0) + ((b.z || 0) - (a.z || 0)) * f
        };
        this.setProjectileAt(p, R);
        // Keep the trail dense enough to read, without growing without bound on a loop.
        if (loop && trailPts.length > 900) {
          trailPts.splice(0, trailPts.length - 600);
        }
        pushTrail(p, R);
        if (!loop && u >= 1) {
          anim = null;
          flying = false;
          if (wantImpact) placeImpact(points[points.length - 1], R);
          opts.onDone?.();
        }
      };
    },
    clearSatellites() {
      satellites.clear();
      satPivots.length = 0;
    },
    addOrbitRing(rOverR, color = GREEN) {
      const inner = Math.max(0.001, rOverR - 0.01);
      const g = new THREE.RingGeometry(inner, rOverR + 0.01, 160);
      const m = new THREE.MeshBasicMaterial({ color, side: THREE.DoubleSide, transparent: true, opacity: 0.95 });
      const mesh = new THREE.Mesh(g, m);
      satellites.add(mesh);
      return mesh;
    },
    addBodyMarker(rOverR, label, color = GREY, phase = 0) {
      const dot = placeholderDot(0.03, color);
      attachOrbit(dot, rOverR, phase);
      return dot;
    },
    async trySkybox(urls) {
      const url = await firstExisting(urls);
      if (!url) return false;
      const tex = await loadTexture(url);
      if (!tex) return false;
      prepareSkyboxTexture(tex, renderer);
      dimSkybox(scene, tex, (typeof innerWidth === "number" && innerWidth <= 900) ? 0.24 : 0.42);
      stars.visible = true;
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
      clouds = model.getObjectByName("earth_clouds") || null;
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
    async addCraft(urls, rOverR, visualSize = 0.055, phase = 0) {
      const group = new THREE.Group();
      const url = await firstExisting(urls);
      if (url) {
        const gltf = await loadGlb(url);
        if (gltf) {
          const model = gltf.scene;
          fitToSize(model, visualSize);
          group.add(model);
          attachOrbit(group, rOverR, phase);
          return group;
        }
      }
      const fallback = placeholderDot(visualSize * 0.5, GREEN);
      group.add(fallback);
      attachOrbit(group, rOverR, phase);
      return group;
    },
    async addMoon(urls, rOverR, radiusScale, phase = 0) {
      const group = new THREE.Group();
      const url = await firstExisting(urls);
      if (url) {
        const gltf = await loadGlb(url);
        if (gltf) {
          const model = gltf.scene;
          model.scale.setScalar(radiusScale);
          group.add(model);
          attachOrbit(group, rOverR, phase);
          return group;
        }
      }
      const fallback = placeholderDot(radiusScale, GREY);
      group.add(fallback);
      attachOrbit(group, rOverR, phase);
      return group;
    },
    dispose() {
      running = false;
      ro.disconnect();
      controls.dispose();
      renderer.dispose();
    }
  };
  stamp();
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

function makeCannonball() {
  const group = new THREE.Group();
  const core = new THREE.Mesh(
    new THREE.SphereGeometry(0.0075, 20, 16),
    new THREE.MeshBasicMaterial({ color: BALL })
  );
  const halo = new THREE.Mesh(
    new THREE.SphereGeometry(0.011, 16, 12),
    new THREE.MeshBasicMaterial({ color: GREEN, transparent: true, opacity: 0.35, depthWrite: false })
  );
  group.add(core);
  group.add(halo);
  return group;
}

function makeImpact() {
  const group = new THREE.Group();
  const ring = new THREE.Mesh(
    new THREE.RingGeometry(0.007, 0.013, 40),
    new THREE.MeshBasicMaterial({ color: GREEN, side: THREE.DoubleSide, transparent: true, opacity: 0.95 })
  );
  const inner = new THREE.Mesh(
    new THREE.RingGeometry(0.002, 0.005, 24),
    new THREE.MeshBasicMaterial({ color: BALL, side: THREE.DoubleSide })
  );
  group.add(ring);
  group.add(inner);
  group.name = "impact";
  return group;
}

function makeLine(color = GREEN, opacity = 1) {
  const geo = new THREE.BufferGeometry();
  geo.setAttribute("position", new THREE.Float32BufferAttribute([0, 0, 0, 0, 0, 0], 3));
  return new THREE.Line(geo, new THREE.LineBasicMaterial({ color, transparent: opacity < 1, opacity }));
}
