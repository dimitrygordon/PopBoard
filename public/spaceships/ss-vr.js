// Spaceships VR. Seated or standing still: the headset pose is WebXR, and this file never moves the camera.
// Session and controllers follow Night Sky (ns-input.js XRInput) and the Beyond 3D storybook.
// Models are the same GLB files the on-screen <model-viewer> loads. USDZ is iOS Quick Look only.
import * as THREE from "../vendor/three/three.module.min.js";
import { GLTFLoader } from "../vendor/three/GLTFLoader.js";
import { MeshoptDecoder } from "../vendor/three/meshopt_decoder.mjs";
import { XRInput } from "../night-sky/ns-input.js";
import { assetUrl, assetExists, neighborCraft } from "./ss-data.js";
import {
  COMFORT_SPAN_M,
  VIEW_DISTANCE_M,
  VR_HINT,
  clampScale,
  realSizeFact,
  shortFact,
  stickDelta,
  userScaleLimit,
  viewScale,
} from "./ss-vr-model.js";

const PANEL_W = 1024;
const PANEL_H = 768;
const PANEL_M_W = 0.62;
const PANEL_M_H = PANEL_M_W * (PANEL_H / PANEL_W);

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
  const camera = new THREE.PerspectiveCamera(70, 1, 0.08, 40);
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

  const anchor = new THREE.Group();
  scene.add(anchor);
  const pivot = new THREE.Group();
  anchor.add(pivot);
  const ring = new THREE.Mesh(
    new THREE.RingGeometry(0.22, 0.25, 48),
    new THREE.MeshBasicMaterial({ color: 0x4caf50, transparent: true, opacity: 0.35, side: THREE.DoubleSide, depthWrite: false })
  );
  ring.rotation.x = -Math.PI / 2;
  anchor.add(ring);

  const panelCanvas = document.createElement("canvas");
  panelCanvas.width = PANEL_W;
  panelCanvas.height = PANEL_H;
  const panelTex = new THREE.CanvasTexture(panelCanvas);
  panelTex.colorSpace = THREE.SRGBColorSpace;
  const panelMesh = new THREE.Mesh(
    new THREE.PlaneGeometry(PANEL_M_W, PANEL_M_H),
    new THREE.MeshBasicMaterial({ map: panelTex, transparent: true, toneMapped: false, depthTest: true })
  );
  // In front of the student, left of the craft, close enough that both eyes can read it.
  panelMesh.position.set(-0.34, -0.28, 0.22);
  anchor.add(panelMesh);

  const hits = [];
  let model = null;
  let span = 1;
  let real = false;
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
  let input = null;
  let session = null;
  let running = null;
  let pinch = 0;
  let last = 0;
  const grabQ = [null, null];

  function baseScale() {
    return viewScale(span, real).scale;
  }
  function displayedSpan() {
    return baseScale() * span;
  }
  function applyScale() {
    const s = baseScale() * clampScale(userScale, userScaleLimit(displayedSpan()));
    pivot.scale.setScalar(s);
  }
  function resetTransform() {
    userScale = 1;
    pivot.quaternion.identity();
    applyScale();
    dirty = true;
  }
  function placeAnchor(eye, forward) {
    _fwd.copy(forward);
    _fwd.y = 0;
    if (_fwd.lengthSq() < 1e-8) _fwd.set(0, 0, -1);
    _fwd.normalize();
    _eye.copy(eye);
    if (_eye.y < 0.4) _eye.y = 1.3;
    anchor.position.copy(_eye).addScaledVector(_fwd, VIEW_DISTANCE_M);
    anchor.position.y = _eye.y - 0.08;
    _back.copy(_fwd).negate();
    anchor.quaternion.setFromUnitVectors(_z, _back);
    ring.position.y = -anchor.position.y + 0.01;
  }
  function placePreview() {
    placeAnchor(new THREE.Vector3(0, 1.35, 0), new THREE.Vector3(0, 0, -1));
    anchor.position.y = 1.25;
    ring.position.y = -anchor.position.y + 0.01;
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
    g.font = "600 52px Jost, system-ui, sans-serif";
    const nameLines = wrapText(g, name, g.font, PANEL_W - 80).slice(0, 2);
    nameLines.forEach((line, i) => g.fillText(line, 40, 78 + i * 58));
    g.fillStyle = "#cccccc";
    g.font = "400 30px Jost, system-ui, sans-serif";
    const fact = loading ? "The model is on its way." : shortFact(craft);
    wrapText(g, fact, g.font, PANEL_W - 80).slice(0, 4).forEach((line, i) => g.fillText(line, 40, 210 + i * 40));
    const scale = viewScale(span, real);
    g.fillStyle = "#4caf50";
    g.font = "600 28px Jost, system-ui, sans-serif";
    g.fillText(loading ? "Loading" : scale.label, 40, 400);
    g.fillStyle = "#888888";
    g.font = "400 26px Jost, system-ui, sans-serif";
    const sizeLine = realSizeFact(craft);
    wrapText(g, sizeLine ? "Real size: " + sizeLine : "", g.font, PANEL_W - 80).slice(0, 2)
      .forEach((line, i) => g.fillText(line, 40, 448 + i * 34));
    wrapText(g, VR_HINT, g.font, PANEL_W - 80).slice(0, 2)
      .forEach((line, i) => g.fillText(line, 40, 530 + i * 32));

    const labels = [
      ["prev", "Previous"],
      ["next", "Next"],
      ["real", real ? "Classroom" : "Real size"],
      ["reset", "Reset"],
      ["exit", "Exit VR"],
    ];
    const gap = 12;
    const x0 = 28;
    const bw = (PANEL_W - x0 * 2 - gap * (labels.length - 1)) / labels.length;
    const by = 620;
    const bh = 112;
    labels.forEach(([id, label], i) => {
      const x = x0 + i * (bw + gap);
      const on = id === "real" && real;
      const hot = hover === id;
      g.fillStyle = on ? "#4caf50" : hot ? "#1a1a1a" : "#111111";
      g.fillRect(x, by, bw, bh);
      g.strokeStyle = on || hot ? "#4caf50" : "#333333";
      g.strokeRect(x + 1, by + 1, bw - 2, bh - 2);
      g.fillStyle = on ? "#000000" : "#cccccc";
      g.font = "600 26px Jost, system-ui, sans-serif";
      const tw = g.measureText(label).width;
      g.fillText(label, x + (bw - tw) / 2, by + 66);
      hits.push({ id, x, y: by, w: bw, h: bh });
    });
    panelTex.needsUpdate = true;
    dirty = false;
  }

  function hitAt(ray) {
    if (!ray) return { button: null, panel: false };
    _raycaster.set(ray.origin, ray.dir);
    _raycaster.far = 8;
    const hit = _raycaster.intersectObject(panelMesh, false)[0];
    if (!hit || !hit.uv) return { button: null, panel: false };
    const px = hit.uv.x * PANEL_W;
    const py = (1 - hit.uv.y) * PANEL_H;
    const button = hits.find((r) => px >= r.x && px <= r.x + r.w && py >= r.y && py <= r.y + r.h);
    return { button: button ? button.id : null, panel: true };
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
    const savedPos = anchor.position.clone();
    const savedQuat = anchor.quaternion.clone();
    anchor.position.set(0, 0, 0);
    anchor.quaternion.identity();
    anchor.updateMatrixWorld(true);
    const box = new THREE.Box3().setFromObject(model);
    const size = box.getSize(new THREE.Vector3());
    const center = box.getCenter(new THREE.Vector3());
    model.position.sub(center);
    anchor.position.copy(savedPos);
    anchor.quaternion.copy(savedQuat);
    span = Math.max(size.x, size.y, size.z, 1e-4);
    // Keep a sensible classroom view when swapping craft. Real size stays a choice.
    real = false;
    userScale = 1;
    pivot.quaternion.identity();
    applyScale();
    craft = next;
    glbUrl = url;
    dirty = true;
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

  function press(id) {
    if (id === "exit" && session) { session.end(); return; }
    if (id === "reset") { resetTransform(); drawPanel(); return; }
    if (id === "real") { real = !real; userScale = 1; applyScale(); dirty = true; drawPanel(); return; }
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
    if (!input) return;
    const hands = input.ctrl.filter((st) => st.squeeze && st.grip);
    if (hands.length >= 2) {
      hands[0].grip.getWorldPosition(_a);
      hands[1].grip.getWorldPosition(_b);
      const dist = _a.distanceTo(_b);
      if (pinch > 0.05 && dist > 0.05) {
        userScale = clampScale(userScale * (dist / pinch), userScaleLimit(displayedSpan()));
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
      _dq.copy(q).multiply(grabQ[i].clone().invert());
      grabQ[i].copy(q);
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
        placeAnchor(_eye, _fwd);
        placed = true;
        dirty = true;
      }
    }
    if (input) input.update(dt);
    const stick = readStick();
    const d = stickDelta(stick.x, stick.y, dt);
    if (d.yaw) {
      _q.setFromAxisAngle(_up, d.yaw);
      pivot.quaternion.premultiply(_q);
    }
    if (d.scale !== 1) {
      userScale = clampScale(userScale * d.scale, userScaleLimit(displayedSpan()));
      applyScale();
    }
    applyGrab();
    if (dirty) drawPanel();
    renderer.render(scene, camera);
  }

  function renderStereo() {
    const w = canvas.width || canvas.clientWidth || 1280;
    const h = canvas.height || canvas.clientHeight || 720;
    renderer.setPixelRatio(1);
    renderer.setSize(w, h, false);
    renderer.setScissorTest(true);
    const eyeW = Math.floor(w / 2);
    const saved = camera.position.clone();
    for (let i = 0; i < 2; i++) {
      const sign = i === 0 ? -1 : 1;
      camera.position.set(sign * 0.032, 1.35, 0);
      camera.aspect = eyeW / h;
      camera.fov = 70;
      camera.lookAt(0, 1.22, -VIEW_DISTANCE_M);
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
      onHover(i, ray) {
        const hit = hitAt(ray);
        const id = hit.button;
        if (i === 0 && id !== hover) { hover = id; dirty = true; }
        if (input) input.setRayLength(i, hit.panel ? 2.2 : 3);
      },
      onSelectStart(i, ray) {
        const hit = hitAt(ray);
        if (hit.button) { press(hit.button); return; }
        if (hit.panel) return;
        resetTransform();
        drawPanel();
      },
      onSelectEnd() {},
      onScrubHours() {},
      onTogglePanel() { press("real"); },
    });
  }

  function setReal(on) {
    real = !!on;
    userScale = 1;
    applyScale();
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
    dirty = true;
    drawPanel();
    renderer.setAnimationLoop(sessionFrame);
    document.fonts.load("600 52px Jost").then(() => { dirty = true; }).catch(() => {});
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
    running = run().finally(() => { running = null; });
    return running;
  }

  return { start, mount, setReal, placePreview, drawPanel, renderStereo, camera, renderer };
}

let live = null;

export async function startSpaceshipVR(opts) {
  const canvas = ensureCanvas();
  if (!live) live = createViewer(canvas);
  return live.start(opts);
}

// One stereo frame of the same placement the headset uses. For checks without a Quest.
export async function renderSpaceshipPreview(canvas, opts) {
  const viewer = createViewer(canvas);
  try { await document.fonts.load("600 52px Jost"); } catch { /* system font */ }
  const url = await resolveGlb(opts.fleet, opts.craft, opts.glbUrl);
  await viewer.mount(opts.craft, url);
  if (opts.real) viewer.setReal(true);
  viewer.placePreview();
  viewer.drawPanel();
  viewer.renderStereo();
  return viewer;
}
