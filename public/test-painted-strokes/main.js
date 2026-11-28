// THROWAWAY tech test (branch test/painted-strokes, not for merge): Quill-style painted strokes live in the browser and in Quest WebXR.
import * as THREE from "../vendor/three/three.module.min.js";   // same vendored r170 build Night Sky imports
import { buildScene, spriteGeometry, SEG } from "./strokes.js";
import { strokeVert, strokeFrag, spriteVert, spriteFrag, bgVert, bgFrag } from "./shaders.js";

const $ = (id) => document.getElementById(id);
const q = new URLSearchParams(location.search);
const D2R = Math.PI / 180;
const flags = { calm: q.get("calm") === "1", flow: q.get("flow") !== "0", teff: +(q.get("T") || 4410) };

const canvas = $("c");
const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, powerPreference: "high-performance", preserveDrawingBuffer: q.has("shot") });
renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
renderer.xr.enabled = true; renderer.xr.setReferenceSpaceType("local-floor"); renderer.xr.setFramebufferScaleFactor(1.0);
renderer.setClearColor(0x050a1e, 1);
const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(48, 1, 0.02, 3000);
const world = new THREE.Group(); scene.add(world);    // XR scales and places this group; desktop leaves it at identity

const built = buildScene(THREE, { teff: flags.teff });
const uni = {
  uFlowT: { value: 0 }, uBoilT: { value: 0 }, uBoil: { value: flags.calm ? 0 : 1 }, uBoilGain: { value: +(q.get("gain") || 1) }, uCamLocal: { value: new THREE.Vector3(0, 0, 1) }, uCosElev: { value: 1 },
  uBreathT: { value: 0 }, uBreath: { value: flags.calm ? 0 : 1 },
};
const mk = (additive) => new THREE.ShaderMaterial({
  vertexShader: strokeVert, fragmentShader: strokeFrag, uniforms: uni, defines: additive ? { ADDITIVE: 1 } : {},
  transparent: true, depthTest: false, depthWrite: false, side: THREE.DoubleSide,
  ...(additive ? { blending: THREE.CustomBlending, blendEquation: THREE.AddEquation, blendSrc: THREE.OneFactor, blendDst: THREE.OneFactor, blendSrcAlpha: THREE.OneFactor, blendDstAlpha: THREE.OneFactor }
    : { blending: THREE.NormalBlending, premultipliedAlpha: true }),
});
const skyMesh = new THREE.Mesh(built.sky, mk(false)); skyMesh.frustumCulled = false; skyMesh.renderOrder = 0;
const diskMesh = new THREE.Mesh(built.disk, mk(false)); diskMesh.frustumCulled = false; diskMesh.renderOrder = 1;
const addMesh = new THREE.Mesh(built.add, mk(true)); addMesh.frustumCulled = false; addMesh.renderOrder = 2;
const bloomMat = new THREE.ShaderMaterial({ vertexShader: spriteVert, fragmentShader: spriteFrag, uniforms: uni, transparent: true, depthTest: false, depthWrite: false, side: THREE.DoubleSide,
  blending: THREE.CustomBlending, blendEquation: THREE.AddEquation, blendSrc: THREE.OneFactor, blendDst: THREE.OneFactor, blendSrcAlpha: THREE.OneFactor, blendDstAlpha: THREE.OneFactor });
const bloomMesh = new THREE.Mesh(spriteGeometry(THREE, built.sprites), bloomMat); bloomMesh.frustumCulled = false; bloomMesh.renderOrder = 3;
const bgMesh = new THREE.Mesh(new THREE.IcosahedronGeometry(900, 3), new THREE.ShaderMaterial({ vertexShader: bgVert, fragmentShader: bgFrag, side: THREE.BackSide, depthTest: false, depthWrite: false }));
bgMesh.frustumCulled = false; bgMesh.renderOrder = -1;
world.add(bgMesh, skyMesh, diskMesh, addMesh, bloomMesh);
const strokeTotal = built.counts.sky + built.counts.disk + built.counts.add;

// ---- painter's sort of the disk strokes (back to front), cheap: re-sorted at most ~8 times a second ----
const dg = built.disk, meta = dg.userData, nS = meta.count, per = meta.per;
const cr = new Float32Array(nS); for (let i = 0; i < nS; i++) cr[i] = Math.hypot(meta.cent[3 * i], meta.cent[3 * i + 2]) + 1e-3;
const idxAttr = dg.getIndex(), idxArr = idxAttr.array, baseIdx = meta.baseIndex;
const keys = new Float32Array(nS), order = Array.from({ length: nS }, (_, i) => i);
let lastSort = -1e9, sortMs = 0;
function resort(camLocal) {
  const t0 = performance.now(); const ft = uni.uFlowT.value, c = meta.cent, om = meta.omega, kd = meta.kinds, tl = ft / 4;
  for (let i = 0; i < nS; i++) {
    const r = cr[i]; let a = 0;
    if (kd[i] === 3) a = (44 / 32) / r * (((tl + om[i]) % 1 + 1) % 1); else a = (7 / 32) / r * Math.sin(2 * Math.PI * tl - 1.05 * r);   // same shear and streak slide as the vertex shader
    const ca = Math.cos(a), sa = Math.sin(a), x = c[3 * i] * ca + c[3 * i + 2] * sa, z = -c[3 * i] * sa + c[3 * i + 2] * ca, y = c[3 * i + 1];
    const dx = x - camLocal.x, dy = y - camLocal.y, dz = z - camLocal.z; keys[i] = dx * dx + dy * dy + dz * dz;
  }
  order.sort((a, b) => keys[b] - keys[a]);
  for (let k = 0; k < nS; k++) { const s = order[k]; idxArr.set(baseIdx.subarray(s * per, s * per + per), k * per); }
  idxAttr.needsUpdate = true; sortMs = performance.now() - t0;
}

// ---- desktop / phone orbit: drag to look, wheel or pinch to zoom ----
const view = { yaw: 18 * D2R, pitch: 23 * D2R, dist: 50 };
const ptrs = new Map(); let pinch0 = 0, dist0 = 0;
canvas.addEventListener("pointerdown", (e) => { canvas.setPointerCapture(e.pointerId); ptrs.set(e.pointerId, [e.clientX, e.clientY]); if (ptrs.size === 2) { const [a, b] = [...ptrs.values()]; pinch0 = Math.hypot(a[0] - b[0], a[1] - b[1]); dist0 = view.dist; } });
canvas.addEventListener("pointermove", (e) => {
  const p = ptrs.get(e.pointerId); if (!p) return;
  if (ptrs.size === 1) { view.yaw -= (e.clientX - p[0]) * 0.006; view.pitch = Math.max(-1.45, Math.min(1.45, view.pitch + (e.clientY - p[1]) * 0.006)); }
  p[0] = e.clientX; p[1] = e.clientY;
  if (ptrs.size === 2) { const [a, b] = [...ptrs.values()]; const d = Math.hypot(a[0] - b[0], a[1] - b[1]); if (pinch0 > 0) view.dist = Math.max(14, Math.min(120, dist0 * pinch0 / d)); }
});
const up = (e) => { ptrs.delete(e.pointerId); pinch0 = 0; };
canvas.addEventListener("pointerup", up); canvas.addEventListener("pointercancel", up);
canvas.addEventListener("wheel", (e) => { e.preventDefault(); view.dist = Math.max(14, Math.min(120, view.dist * Math.exp(e.deltaY * 0.001))); }, { passive: false });
if (q.has("yaw")) view.yaw = +q.get("yaw") * D2R; if (q.has("pitch")) view.pitch = +q.get("pitch") * D2R; if (q.has("dist")) view.dist = +q.get("dist");

// ---- Calm lines ----
function setCalm(on) {
  flags.calm = !!on; $("calm").setAttribute("aria-pressed", on ? "true" : "false"); $("calm").classList.toggle("on", !!on);
  uni.uBoil.value = on ? 0 : 1; uni.uBreath.value = on ? 0 : 1;
}
$("calm").addEventListener("click", () => setCalm(!flags.calm)); setCalm(flags.calm);

// ---- Enter VR (same pattern as Night Sky: hide the button unless immersive-vr is supported) ----
let xrSession = null;
const xrNote = $("vrNote"), vrBtn = $("vr");
async function checkXr() {
  let ok = false;
  if (navigator.xr && navigator.xr.isSessionSupported) { try { ok = await navigator.xr.isSessionSupported("immersive-vr"); } catch { ok = false; } }
  vrBtn.hidden = !ok; xrNote.hidden = ok;
}
function placeForXr(on) { if (on) { world.scale.setScalar(0.07); world.position.set(0, 0.85, -2.7); } else { world.scale.setScalar(1); world.position.set(0, 0, 0); } }
vrBtn.addEventListener("click", async () => {
  if (xrSession) { await xrSession.end(); return; }
  try {
    const session = await navigator.xr.requestSession("immersive-vr", { optionalFeatures: ["local-floor", "bounded-floor", "hand-tracking"] });
    xrSession = session; session.addEventListener("end", () => { xrSession = null; placeForXr(false); vrBtn.querySelector(".lbl").textContent = "Enter VR"; });
    await renderer.xr.setSession(session); placeForXr(true); vrBtn.querySelector(".lbl").textContent = "In VR";
  } catch (err) { xrSession = null; console.error(err); $("status").textContent = "Could not start VR: " + (err && err.message ? err.message : err); }
});
// in the headset there is no DOM, so a trigger pull toggles Calm lines
for (let i = 0; i < 2; i++) renderer.xr.getController(i).addEventListener("selectstart", () => setCalm(!flags.calm));
checkXr();

// ---- size ----
function resize() { const w = window.innerWidth, h = window.innerHeight; renderer.setSize(w, h, false); camera.aspect = w / h; camera.fov = w / h < 0.8 ? 62 : 48; camera.updateProjectionMatrix(); }
addEventListener("resize", resize); resize();

// ---- loop with a frame-time readout ----
const stats = { frames: 0, acc: 0, ms: 0, fps: 0, worst: 0, last: performance.now(), samples: [] };
const tmp = new THREE.Vector3(), camLocal = new THREE.Vector3();
let prev = 0, flowT = 0, boilT = 0;
function frame(now, xrFrame) {
  const dt = (prev && !manual) ? Math.min(0.1, (now - prev) / 1000) : 0; prev = now;
  if (!flags.calm) { boilT += dt; if (flags.flow) flowT += dt; }
  uni.uBoilT.value = boilT; uni.uFlowT.value = flowT; uni.uBreathT.value = flowT;
  const presenting = renderer.xr.isPresenting;
  if (!presenting) {
    const cp = Math.cos(view.pitch); camera.position.set(Math.sin(view.yaw) * cp, Math.sin(view.pitch), Math.cos(view.yaw) * cp).multiplyScalar(view.dist);
    camera.lookAt(0, 0, 0);
  }
  const cam = presenting ? renderer.xr.getCamera() : camera;
  cam.getWorldPosition(tmp); world.updateMatrixWorld(true); camLocal.copy(tmp); world.worldToLocal(camLocal);
  uni.uCamLocal.value.copy(camLocal); uni.uCosElev.value = Math.max(0.25, Math.hypot(camLocal.x, camLocal.z) / (camLocal.length() || 1));
  if (now - lastSort > 120) { resort(camLocal); lastSort = now; }
  const t0 = performance.now();
  renderer.render(scene, camera);
  const cpu = performance.now() - t0;
  const dtf = now - stats.last; stats.last = now; stats.frames++; stats.acc += dtf; stats.worst = Math.max(stats.worst, dtf); stats.cpuAcc = (stats.cpuAcc || 0) + cpu;
  if (dtf > 0 && dtf < 1000) stats.samples.push(dtf);
  if (stats.acc >= 500) {
    stats.ms = stats.acc / stats.frames; stats.fps = 1000 / stats.ms; stats.cpuMs = stats.cpuAcc / stats.frames;
    $("fps").textContent = `${stats.fps.toFixed(0)} fps  ${stats.ms.toFixed(1)} ms/frame (CPU ${stats.cpuMs.toFixed(1)})\n${strokeTotal} strokes  ${renderer.info.render.calls} draw calls  ${(renderer.info.render.triangles / 1000).toFixed(0)}k tris`;
    stats.frames = 0; stats.acc = 0; stats.cpuAcc = 0; stats.worst = 0;
  }
}
const manual = q.get("manual") === "1";   // test hook: deterministic clock so headless software GL can still prove the boil
if (!manual) renderer.setAnimationLoop(frame);

window.__strokeTest = {
  THREE_REVISION: THREE.REVISION, counts: { ...built.counts, strokes: strokeTotal }, starRGB: built.starRGB, teff: flags.teff, flags, setCalm, view,
  info: () => ({ calls: renderer.info.render.calls, triangles: renderer.info.render.triangles, vertices: built.sky.attributes.position.count + built.disk.attributes.position.count + built.add.attributes.position.count, sortMs }),
  frameStats: () => { const s = stats.samples.slice().sort((a, b) => a - b); return { n: s.length, mean: s.reduce((a, b) => a + b, 0) / (s.length || 1), median: s[s.length >> 1], p95: s[Math.floor(s.length * 0.95)] }; },
  renderAt(t) { if (!manual) return; if (!flags.calm) { boilT = t; if (flags.flow) flowT = t; } lastSort = -1e9; frame(t * 1000 + 1, null); },
  resetSamples: () => { stats.samples.length = 0; },
};
$("status").hidden = true;
