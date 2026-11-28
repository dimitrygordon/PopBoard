// Spaceships VR. Seated or standing still: the headset pose is WebXR, and this file never moves the camera.
// Session and controllers follow Night Sky (ns-input.js XRInput) and the Beyond 3D storybook.
// Models are the same GLB files the on-screen <model-viewer> loads. USDZ is iOS Quick Look only.
// Real size is the GLB's meters with no cap. Closer and Farther slide the object, not the student.
import * as THREE from "../vendor/three/three.module.min.js";
import { GLTFLoader } from "../vendor/three/GLTFLoader.js";
import { MeshoptDecoder } from "../vendor/three/meshopt_decoder.mjs";
import { XRInput } from "../night-sky/ns-input.js";
import { assetUrl, assetExists, neighborCraft } from "./ss-data.js";
import {
  CLOSE_MIN_M,
  VR_HINT,
  buttonAt,
  classroomPlacement,
  clampScale,
  depthRange,
  distanceLimits,
  easeDistance,
  grabTurn,
  initialPlacement,
  panelButtons,
  placementKind,
  placementNote,
  realSizeLine,
  resolveSelect,
  shortFact,
  stepDistance,
  stickDelta,
  viewScale,
} from "./ss-vr-model.js";

const PANEL_W = 1024;
const PANEL_H = 768;
const PANEL_M_W = 0.5;
const PANEL_M_H = PANEL_M_W * (PANEL_H / PANEL_W);
// A three-quarter turn so a station's arrays are not edge-on. Rockets stay unrotated.
const REST_YAW = 1.15;

const _eye = new THREE.Vector3();
const _fwd = new THREE.Vector3();
const _back = new THREE.Vector3();
const _z = new THREE.Vector3(0, 0, 1);
const _up = new THREE.Vector3(0, 1, 0);
const _q = new THREE.Quaternion();
const _dq = new THREE.Quaternion();
const _a = new THREE.Vector3();
const _b = new THREE.Vector3();
const _raycaster = new THREE.Raycaster();
const _size = new THREE.Vector3();
const _center = new THREE.Vector3();

function ensureCanvas() {
  let canvas = document.getElementById("ssVrCanvas");
  if (!canvas) {
    canvas = document.createElement("canvas");
    canvas.id = "ssVrCanvas";
    canvas.className = "ss-vr-canvas";
    canvas.setAttribute("aria-hidden", "true");
    document.body.appendChild(canvas);
  }
  return canvas;
}

async function resolveGlb(fleet, craft, glbUrl) {
  if (glbUrl) return glbUrl;
  const wanted = assetUrl(craft && craft.glb);
  if (wanted && await assetExists(wanted)) return wanted;
  return assetUrl((fleet && fleet.placeholderGlb) || "models/_placeholder.glb");
}

function loadGlb(url) {
  const loader = new GLTFLoader();
  const ready = MeshoptDecoder && MeshoptDecoder.ready ? MeshoptDecoder.ready : Promise.resolve();
  return ready.then(() => {
    if (MeshoptDecoder) loader.setMeshoptDecoder(MeshoptDecoder);
    return loader.loadAsync(url);
  });
}

function disposeRoot(root) {
  if (!root) return;
  root.traverse((o) => {
    if (o.geometry) o.geometry.dispose();
    const mats = o.material ? [].concat(o.material) : [];
    for (const m of mats) {
      if (!m) continue;
      for (const key of ["map", "normalMap", "emissiveMap", "roughnessMap", "metalnessMap", "aoMap"]) {
        if (m[key]) m[key].dispose();
      }
      m.dispose();
    }
  });
}

function wrapText(g, text, font, maxW) {
  g.font = font;
  const out = [];
  let line = "";
  for (const word of String(text || "").split(" ")) {
    const next = line ? line + " " + word : word;
    if (g.measureText(next).width > maxW && line) {
      out.push(line);
      line = word;
    } else line = next;
  }
  if (line) out.push(line);
  return out;
}

function createViewer(canvas) {
  const renderer = new THREE.WebGLRenderer({
    canvas,
    antialias: true,
    alpha: false,
    powerPreference: "high-performance",
    logarithmicDepthBuffer: true,
  });
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1;
  renderer.setPixelRatio(1);
  renderer.setClearColor(0x000000, 1);
  renderer.xr.enabled = true;
  renderer.xr.setReferenceSpaceType("local-floor");
  renderer.xr.setFramebufferScaleFactor(1);

  const scene = new THREE.Scene();
  scene.background = new THREE.Color(0x000000);
  const camera = new THREE.PerspectiveCamera(70, 1, 0.05, 500);
  camera.position.set(0, 1.35, 0);

  scene.add(new THREE.HemisphereLight(0xffffff, 0x202020, 0.95));
  const key = new THREE.DirectionalLight(0xffffff, 2.4);
  key.position.set(0.8, 1.8, 1.1);
  scene.add(key);
  const fill = new THREE.DirectionalLight(0xc5d0ea, 0.85);
  fill.position.set(-1.4, 0.7, -0.6);
  scene.add(fill);
  try {
    const pmrem = new THREE.PMREMGenerator(renderer);
    const envScene = new THREE.Scene();
    envScene.add(new THREE.Mesh(
      new THREE.BoxGeometry(6, 6, 6),
      new THREE.MeshBasicMaterial({ color: 0x2c2c2c, side: THREE.BackSide })
    ));
    const bulb = new THREE.Mesh(
      new THREE.SphereGeometry(0.35, 10, 8),
      new THREE.MeshBasicMaterial({ color: 0xffffff })
    );
    bulb.position.set(0, 2.1, 0.6);
    envScene.add(bulb);
    scene.environment = pmrem.fromScene(envScene, 0.04).texture;
    pmrem.dispose();
  } catch { /* directional lights still light the model */ }

  // stage sits on the eyes once. The object slides in this frame. The panel does not.
  const stage = new THREE.Group();
  scene.add(stage);
  const anchor = new THREE.Group();
  stage.add(anchor);
  const pivot = new THREE.Group();
  anchor.add(pivot);

  const floor = new THREE.Mesh(
    new THREE.CircleGeometry(1, 72),
    new THREE.MeshBasicMaterial({ color: 0x161616, side: THREE.DoubleSide, depthWrite: false })
  );
  floor.rotation.x = -Math.PI / 2;
  floor.position.y = 0;
  floor.visible = false;
  scene.add(floor);

  const panelCanvas = document.createElement("canvas");
  panelCanvas.width = PANEL_W;
  panelCanvas.height = PANEL_H;
  const panelTex = new THREE.CanvasTexture(panelCanvas);
  panelTex.colorSpace = THREE.SRGBColorSpace;
  const panelMesh = new THREE.Mesh(
    new THREE.PlaneGeometry(PANEL_M_W, PANEL_M_H),
    new THREE.MeshBasicMaterial({ map: panelTex, transparent: true, toneMapped: false, depthTest: true, side: THREE.DoubleSide })
  );
  panelMesh.frustumCulled = false;
  // Just below the view center, close enough that both eyes can read every button. Local -Z is forward.
  panelMesh.position.set(-0.04, -0.46, -0.95);
  stage.add(panelMesh);
  // A mesh ray and dot, not a Line: logarithmic depth hides LineBasic rays on Quest.
  const cursor = new THREE.Mesh(
    new THREE.SphereGeometry(0.012, 12, 8),
    new THREE.MeshBasicMaterial({ color: 0x4caf50, depthTest: false, toneMapped: false })
  );
  cursor.renderOrder = 100;
  cursor.visible = false;
  cursor.frustumCulled = false;
  scene.add(cursor);
  const aimRay = new THREE.Mesh(
    new THREE.CylinderGeometry(0.003, 0.003, 1, 6),
    new THREE.MeshBasicMaterial({ color: 0xcfe8ff, transparent: true, opacity: 0.9, depthTest: false, toneMapped: false })
  );
  aimRay.renderOrder = 99;
  aimRay.visible = false;
  aimRay.frustumCulled = false;
  scene.add(aimRay);
  const _rayO = new THREE.Vector3();
  const _rayD = new THREE.Vector3();
  const _upRay = new THREE.Vector3(0, 1, 0);

  const hits = [];
  let model = null;
  let span = 1;
  let box = { x: 1, y: 1, z: 1 };
  let real = true;
  let userScale = 1;
  let craft = null;
  let fleet = null;
  let onCraft = null;
  let glbUrl = "";
  let loading = false;
  let placed = false;
  let placeFrames = 0;
  let dirty = true;
  let hover = null;
  let pointingAtPanel = false;
  let sawButton = false;
  let input = null;
  let session = null;
  let running = null;
  let pinch = 0;
  let last = 0;
  let eyeY = 1.35;
  let kind = "fit";
  let pose = classroomPlacement(eyeY);
  let distNow = pose.distance;
  let distGoal = pose.distance;
  const grabQ = [null, null];

  function restOrientation() {
    const yaw = real && kind === "ground" ? 0 : REST_YAW;
    pivot.quaternion.setFromAxisAngle(_up, yaw);
  }
  function baseScale() {
    return viewScale(span, real).scale;
  }
  function gapLimit() {
    const half = (real && kind === "ground") ? Math.max(box.x, box.z) / 2 : span / 2;
    const reach = half * baseScale();
    if (reach < 1e-6) return 3;
    return (distNow - CLOSE_MIN_M) / reach;
  }
  function applyScale() {
    const s = baseScale() * clampScale(userScale, gapLimit());
    pivot.scale.setScalar(Number.isFinite(s) && s > 0 ? s : 1);
  }
  function limits() {
    return distanceLimits(span, box, real ? kind : "fit");
  }
  function applyDepth() {
    const range = depthRange(real ? span : 2);
    camera.near = range.near;
    camera.far = range.far;
    camera.updateProjectionMatrix();
    if (session && session.updateRenderState) {
      try { session.updateRenderState({ depthNear: range.near, depthFar: range.far }); } catch { /* session already ended */ }
    }
  }
  function applyObjectPosition() {
    anchor.position.set(pose.side, pose.centerY - eyeY, -distNow);
    const showFloor = real && kind === "ground";
    floor.visible = showFloor;
    if (showFloor) {
      const radius = Math.max(40, distGoal * 3, span);
      floor.scale.setScalar(radius);
    }
  }
  function usePlacement(next, snap) {
    pose = next;
    distGoal = next.distance;
    if (snap) distNow = next.distance;
    applyObjectPosition();
    applyDepth();
  }
  function poseForMode(snap) {
    const next = real ? initialPlacement(span, box, kind, eyeY) : classroomPlacement(eyeY);
    usePlacement(next, snap);
  }
  function placeStage(eye, forward) {
    _fwd.copy(forward);
    _fwd.y = 0;
    if (_fwd.lengthSq() < 1e-8) _fwd.set(0, 0, -1);
    _fwd.normalize();
    _eye.copy(eye);
    if (_eye.y < 0.4) _eye.y = 1.3;
    eyeY = _eye.y;
    stage.position.copy(_eye);
    _back.copy(_fwd).negate();
    stage.quaternion.setFromUnitVectors(_z, _back);
    poseForMode(true);
  }
  function placePreview() {
    placeStage(new THREE.Vector3(0, 1.35, 0), new THREE.Vector3(0, 0, -1));
  }
  function lookAtPoint(out) {
    const targetY = kind === "ground" && real ? Math.min(pose.centerY, eyeY + 9) : pose.centerY;
    out.set(pose.side, targetY - eyeY, -distNow);
    stage.localToWorld(out);
    return out;
  }

  function drawPanel() {
    const g = panelCanvas.getContext("2d");
    hits.length = 0;
    g.clearRect(0, 0, PANEL_W, PANEL_H);
    g.fillStyle = "#0c0c0c";
    g.fillRect(0, 0, PANEL_W, PANEL_H);
    g.strokeStyle = "#333333";
    g.lineWidth = 4;
    g.strokeRect(8, 8, PANEL_W - 16, PANEL_H - 16);
    const name = (craft && craft.name) || "Spaceship";
    g.fillStyle = "#ffffff";
    g.font = "600 48px Jost, system-ui, sans-serif";
    wrapText(g, name, g.font, PANEL_W - 72).slice(0, 2).forEach((line, i) => g.fillText(line, 36, 70 + i * 52));
    g.fillStyle = "#cccccc";
    g.font = "400 28px Jost, system-ui, sans-serif";
    const fact = loading ? "The model is on its way." : shortFact(craft, 140);
    wrapText(g, fact, g.font, PANEL_W - 72).slice(0, 3).forEach((line, i) => g.fillText(line, 36, 186 + i * 36));
    const scale = viewScale(span, real);
    g.fillStyle = "#4caf50";
    g.font = "600 28px Jost, system-ui, sans-serif";
    g.fillText(loading ? "Loading" : scale.label, 36, 320);
    g.fillStyle = "#cccccc";
    g.font = "400 26px Jost, system-ui, sans-serif";
    const sizeLine = realSizeLine(craft);
    wrapText(g, sizeLine, g.font, PANEL_W - 72).slice(0, 2).forEach((line, i) => g.fillText(line, 36, 362 + i * 32));
    const note = real ? placementNote(kind) : "";
    g.fillStyle = "#888888";
    wrapText(g, note, g.font, PANEL_W - 72).slice(0, 2).forEach((line, i) => g.fillText(line, 36, 436 + i * 30));
    wrapText(g, VR_HINT, g.font, PANEL_W - 72).slice(0, 2).forEach((line, i) => g.fillText(line, 36, 508 + i * 28));

    for (const r of panelButtons(real)) {
      const hot = hover === r.id;
      g.fillStyle = hot ? "#16331a" : "#111111";
      g.fillRect(r.x, r.y, r.w, r.h);
      g.strokeStyle = hot ? "#4caf50" : "#333333";
      g.lineWidth = hot ? 6 : 4;
      g.strokeRect(r.x + 1, r.y + 1, r.w - 2, r.h - 2);
      g.fillStyle = hot ? "#4caf50" : "#cccccc";
      g.font = "600 24px Jost, system-ui, sans-serif";
      const tw = g.measureText(r.label).width;
      g.fillText(r.label, r.x + (r.w - tw) / 2, r.y + r.h * 0.62);
      hits.push(r);
    }
    panelTex.needsUpdate = true;
    dirty = false;
  }

  // three.js writes the Quest pose into controller.matrix and only flags matrixWorld.
  // selectstart fires before the scene rebuilds matrixWorld, so a ray read from matrixWorld
  // is still at the origin and misses the panel. Rebuild both before the test.
  function freshRay(i) {
    const st = input && input.ctrl[i];
    if (!st || !st.c) return null;
    st.c.updateMatrixWorld(true);
    panelMesh.updateWorldMatrix(true, false);
    _rayO.setFromMatrixPosition(st.c.matrixWorld);
    _rayD.set(0, 0, -1).transformDirection(st.c.matrixWorld);
    if (_rayD.lengthSq() < 1e-8) return null;
    return { origin: _rayO, dir: _rayD };
  }
  function hitAt(ray) {
    if (!ray || !ray.origin || !ray.dir) return { button: null, panel: false, point: null, distance: 0 };
    panelMesh.updateWorldMatrix(true, false);
    _raycaster.set(ray.origin, ray.dir);
    _raycaster.near = 0;
    _raycaster.far = 8;
    const hit = _raycaster.intersectObject(panelMesh, false)[0];
    if (!hit || !hit.uv) return { button: null, panel: false, point: null, distance: 0 };
    const px = hit.uv.x * PANEL_W;
    const py = (1 - hit.uv.y) * PANEL_H;
    const button = buttonAt(px, py, hits);
    return { button, panel: true, point: hit.point, distance: hit.distance };
  }
  function showAim(ray, hit) {
    if (!ray) { aimRay.visible = false; cursor.visible = false; return; }
    const len = hit && hit.panel ? Math.max(0.05, hit.distance) : 2;
    aimRay.visible = true;
    aimRay.quaternion.setFromUnitVectors(_upRay, _rayD);
    aimRay.position.copy(_rayO).addScaledVector(_rayD, len / 2);
    aimRay.scale.set(1, len, 1);
    if (hit && hit.panel && hit.point) {
      cursor.visible = true;
      cursor.position.copy(hit.point);
    } else cursor.visible = false;
  }

  function measure(root, groundUp) {
    root.rotation.set(0, 0, 0);
    root.position.set(0, 0, 0);
    root.updateMatrixWorld(true);
    let bounds = new THREE.Box3().setFromObject(root);
    bounds.getSize(_size);
    if (groundUp && _size.z >= _size.y && _size.z >= _size.x) root.rotation.x = -Math.PI / 2;
    else if (groundUp && _size.x > _size.y && _size.x >= _size.z) root.rotation.z = Math.PI / 2;
    root.updateMatrixWorld(true);
    bounds = new THREE.Box3().setFromObject(root);
    bounds.getCenter(_center);
    root.position.sub(_center);
    root.updateMatrixWorld(true);
    bounds = new THREE.Box3().setFromObject(root);
    bounds.getSize(_size);
    return { x: _size.x, y: _size.y, z: _size.z };
  }

  async function mount(next, url) {
    const gltf = await loadGlb(url);
    disposeRoot(model);
    if (model) pivot.remove(model);
    model = gltf.scene;
    model.traverse((o) => {
      if (!o.isMesh) return;
      o.castShadow = false;
      o.receiveShadow = false;
      const mats = [].concat(o.material || []);
      for (const m of mats) {
        if (m && m.envMapIntensity != null) m.envMapIntensity = 1;
      }
    });
    pivot.scale.setScalar(1);
    pivot.quaternion.identity();
    pivot.add(model);
    const savedPos = stage.position.clone();
    const savedQuat = stage.quaternion.clone();
    const savedAnchor = anchor.position.clone();
    stage.position.set(0, 0, 0);
    stage.quaternion.identity();
    anchor.position.set(0, 0, 0);
    stage.updateMatrixWorld(true);
    kind = placementKind(next, 1);
    // Rockets stand upright. Measure after that turn, then set the real kind from the true span.
    const measured = measure(model, isGroundGuess(next));
    span = Math.max(measured.x, measured.y, measured.z, 1e-4);
    box = measured;
    kind = placementKind(next, span);
    if (kind === "ground" && !isGroundGuess(next)) {
      const again = measure(model, true);
      span = Math.max(again.x, again.y, again.z, 1e-4);
      box = again;
    }
    stage.position.copy(savedPos);
    stage.quaternion.copy(savedQuat);
    anchor.position.copy(savedAnchor);
    // Opening view and Reset are true size. Classroom is a toggle from there.
    real = true;
    userScale = 1;
    restOrientation();
    craft = next;
    glbUrl = url;
    poseForMode(true);
    applyScale();
    dirty = true;
  }

  function isGroundGuess(next) {
    return placementKind(next, 1) === "ground";
  }

  async function go(delta) {
    if (loading || !fleet) return;
    const next = neighborCraft(fleet, craft && craft.id, delta);
    if (!next || (craft && next.id === craft.id)) return;
    loading = true;
    dirty = true;
    try {
      const url = await resolveGlb(fleet, next, "");
      await mount(next, url);
      if (onCraft) await onCraft(next);
    } catch {
      dirty = true;
    } finally {
      loading = false;
      dirty = true;
      drawPanel();
    }
  }

  function resetTransform() {
    real = true;
    userScale = 1;
    restOrientation();
    applyScale();
    poseForMode(false);
    dirty = true;
  }

  function press(id) {
    if (id === "exit" && session) { session.end(); return; }
    if (id === "reset") { resetTransform(); drawPanel(); return; }
    if (id === "real") {
      real = !real;
      userScale = 1;
      restOrientation();
      applyScale();
      poseForMode(false);
      dirty = true;
      drawPanel();
      return;
    }
    if (id === "closer") { distGoal = stepDistance(distGoal, -1, limits()); return; }
    if (id === "farther") { distGoal = stepDistance(distGoal, 1, limits()); return; }
    if (id === "next") go(1);
    if (id === "prev") go(-1);
  }

  function readStick() {
    if (!input) return { x: 0, y: 0 };
    let x = 0;
    let y = 0;
    for (const st of input.ctrl) {
      const gp = st.source && st.source.gamepad;
      if (!gp || gp.axes.length < 4) continue;
      if (Math.abs(gp.axes[2]) > Math.abs(x)) x = gp.axes[2];
      if (Math.abs(gp.axes[3]) > Math.abs(y)) y = gp.axes[3];
    }
    return { x, y };
  }

  function applyGrab() {
    if (!input || pointingAtPanel) {
      grabQ[0] = grabQ[1] = null;
      pinch = 0;
      return;
    }
    const hands = input.ctrl.filter((st) => st.squeeze && st.grip);
    if (hands.length >= 2) {
      hands[0].grip.getWorldPosition(_a);
      hands[1].grip.getWorldPosition(_b);
      const dist = _a.distanceTo(_b);
      if (pinch > 0.05 && dist > 0.05) {
        userScale = clampScale(userScale * (dist / pinch), gapLimit());
        applyScale();
      }
      pinch = dist;
      grabQ[0] = grabQ[1] = null;
      return;
    }
    pinch = 0;
    input.ctrl.forEach((st, i) => {
      if (!st.squeeze || !st.grip) { grabQ[i] = null; return; }
      const q = st.grip.quaternion;
      if (!grabQ[i]) { grabQ[i] = q.clone(); return; }
      const turn = grabTurn(grabQ[i], q);
      grabQ[i].copy(q);
      _dq.set(turn.x, turn.y, turn.z, turn.w);
      const ang = 2 * Math.acos(Math.min(1, Math.abs(_dq.w)));
      if (ang < 0.004) return;
      pivot.quaternion.premultiply(_dq);
    });
  }

  // Headset frame. The WebXR camera is left alone: no position, no turn, no zoom from this app.
  function sessionFrame(now) {
    const t = now || performance.now();
    const dt = last ? Math.min(0.05, (t - last) / 1000) : 0;
    last = t;
    if (renderer.xr.isPresenting && !placed) {
      placeFrames += 1;
      const cam = renderer.xr.getCamera();
      cam.getWorldPosition(_eye);
      if (_eye.y > 0.3 || placeFrames > 15) {
        cam.getWorldDirection(_fwd);
        placeStage(_eye, _fwd);
        placed = true;
        dirty = true;
      }
    }
    if (input) {
      pointingAtPanel = false;
      sawButton = false;
      for (const st of input.ctrl) if (st.c) st.c.updateMatrixWorld(true);
      input.update(dt);
      if (!sawButton && hover) { hover = null; dirty = true; }
    }
    const stick = readStick();
    const d = stickDelta(stick.x, stick.y, dt);
    if (d.yaw) {
      _q.setFromAxisAngle(_up, d.yaw);
      pivot.quaternion.premultiply(_q);
    }
    if (d.scale !== 1) {
      userScale = clampScale(userScale * d.scale, gapLimit());
      applyScale();
    }
    applyGrab();
    const before = distNow;
    distNow = easeDistance(distNow, distGoal, dt);
    if (distNow !== before) applyObjectPosition();
    if (dirty) drawPanel();
    renderer.render(scene, camera);
  }

  function renderStereo() {
    const w = canvas.width || canvas.clientWidth || 1280;
    const h = canvas.height || canvas.clientHeight || 720;
    renderer.setPixelRatio(1);
    renderer.setSize(w, h, false);
    applyDepth();
    renderer.setScissorTest(true);
    const eyeW = Math.floor(w / 2);
    const saved = camera.position.clone();
    const look = new THREE.Vector3();
    lookAtPoint(look);
    for (let i = 0; i < 2; i++) {
      const sign = i === 0 ? -1 : 1;
      camera.position.set(sign * 0.032, eyeY, 0);
      camera.aspect = eyeW / h;
      camera.fov = 70;
      camera.lookAt(look);
      camera.updateProjectionMatrix();
      renderer.setViewport(i * eyeW, 0, eyeW, h);
      renderer.setScissor(i * eyeW, 0, eyeW, h);
      renderer.render(scene, camera);
    }
    camera.position.copy(saved);
    renderer.setScissorTest(false);
  }

  function bindInput() {
    if (input) return;
    input = new XRInput(THREE, renderer, scene, {
      onHover(i) {
        const ray = freshRay(i);
        const hit = hitAt(ray);
        showAim(ray, hit);
        if (hit.panel) pointingAtPanel = true;
        if (hit.button) {
          sawButton = true;
          if (hit.button !== hover) { hover = hit.button; dirty = true; }
        }
        if (input) input.setRayLength(i, hit.panel ? Math.max(0.15, hit.distance) : 2.2);
      },
      onSelectStart(i) {
        const ray = freshRay(i);
        const hit = hitAt(ray);
        showAim(ray, hit);
        pointingAtPanel = !!hit.panel;
        const decision = resolveSelect(hit);
        if (decision.rotate) return;
        if (decision.action && decision.action !== "reset") { press(decision.action); drawPanel(); return; }
        if (decision.action === "reset") { resetTransform(); drawPanel(); }
      },
      onSelectEnd() {},
      onScrubHours() {},
      onTogglePanel() { press("real"); },
    });
  }

  function setReal(on) {
    real = on !== false;
    userScale = 1;
    restOrientation();
    applyScale();
    poseForMode(true);
    dirty = true;
  }

  async function run() {
    // First await must be requestSession so the click's user activation is still valid.
    const next = await navigator.xr.requestSession("immersive-vr", {
      optionalFeatures: ["local-floor", "bounded-floor", "hand-tracking"],
    });
    session = next;
    let endResolve;
    const ended = new Promise((resolve) => { endResolve = resolve; });
    next.addEventListener("end", () => {
      renderer.setAnimationLoop(null);
      canvas.classList.remove("is-on");
      placed = false;
      placeFrames = 0;
      session = null;
      endResolve();
    });
    try {
      await renderer.xr.setSession(next);
    } catch (err) {
      try { await next.end(); } catch { /* already ending */ }
      throw err;
    }
    canvas.classList.add("is-on");
    bindInput();
    placed = false;
    placeFrames = 0;
    last = 0;
    loading = true;
    real = true;
    dirty = true;
    drawPanel();
    renderer.setAnimationLoop(sessionFrame);
    document.fonts.load("600 48px Jost").then(() => { dirty = true; }).catch(() => {});
    try {
      const url = await resolveGlb(fleet, craft, glbUrl);
      await mount(craft, url);
    } catch {
      loading = false;
      dirty = true;
    }
    loading = false;
    dirty = true;
    drawPanel();
    await ended;
  }

  function start(opts) {
    if (running) return running;
    fleet = opts.fleet;
    onCraft = opts.onCraft || null;
    craft = opts.craft;
    glbUrl = opts.glbUrl || "";
    real = true;
    running = run().finally(() => { running = null; });
    return running;
  }

  return {
    start, mount, setReal, placePreview, drawPanel, renderStereo, lookAtPoint,
    camera, renderer,
    get pose() { return pose; },
    get real() { return real; },
  };
}

let live = null;

export async function startSpaceshipVR(opts) {
  const canvas = ensureCanvas();
  if (!live) live = createViewer(canvas);
  return live.start(opts);
}

// One stereo frame of the same placement the headset uses. For checks without a Quest.
// Opens at real size unless classroom is requested.
export async function renderSpaceshipPreview(canvas, opts) {
  const viewer = createViewer(canvas);
  try { await document.fonts.load("600 48px Jost"); } catch { /* system font */ }
  const url = await resolveGlb(opts.fleet, opts.craft, opts.glbUrl);
  await viewer.mount(opts.craft, url);
  if (opts.classroom) viewer.setReal(false);
  viewer.placePreview();
  viewer.drawPanel();
  viewer.renderStereo();
  return viewer;
}
