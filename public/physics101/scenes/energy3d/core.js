import * as THREE from "../../../vendor/three/three.module.min.js";
import { palette } from "./palette.js";
export { THREE, palette };

const clamp = (v, a, b) => Math.min(b, Math.max(a, v));
const hasDoc = () => typeof document !== "undefined";
export function isDark() {
  if (!hasDoc()) return false;
  const t = document.documentElement.dataset.theme;
  if (t) return t === "dark";
  return typeof matchMedia === "function" && matchMedia("(prefers-color-scheme: dark)").matches;
}
function reduced() {
  return typeof matchMedia === "function" && matchMedia("(prefers-reduced-motion: reduce)").matches;
}
function webgl() {
  try {
    const c = document.createElement("canvas");
    return !!(window.WebGL2RenderingContext && c.getContext("webgl2")) || !!c.getContext("webgl");
  } catch { return false; }
}

// Pencil look. Ink outline: back faces pushed out a fixed 1.25 CSS px in screen space, so small meshes get the same line.
const INK_RES = { value: new THREE.Vector2(800, 450) };
function inkMaterial() {
  return new THREE.ShaderMaterial({
    side: THREE.BackSide,
    uniforms: { uRes: INK_RES, uPx: { value: 1.25 }, uColor: { value: new THREE.Color(isDark() ? 0xEDE6D6 : 0x2B2622) } },
    vertexShader: "uniform vec2 uRes; uniform float uPx;\nvoid main(){ vec4 c = projectionMatrix * modelViewMatrix * vec4(position, 1.0); vec3 n = normalize(normalMatrix * normal); vec2 d = (projectionMatrix * vec4(n, 0.0)).xy; float l = length(d); float h = fract(sin(dot(position, vec3(12.9898, 78.233, 37.719))) * 43758.5453); if (l > 1e-5) c.xy += d / l * (2.0 * (uPx + (h - 0.5))  / uRes) * c.w; gl_Position = c; }",
    fragmentShader: "uniform vec3 uColor; void main(){ gl_FragColor = vec4(uColor, 1.0); }",
  });
}
// Hatch: diagonal pencil strokes where the toon shading falls into shadow.
function hatch(mat) {
  mat.onBeforeCompile = (sh) => {
    // Leo general: cross-hatching. One wobbly diagonal set in the mid band, a crossing set in the dark band,
    // and a faint per-pixel pencil grain everywhere.
    sh.fragmentShader = sh.fragmentShader.replace("#include <opaque_fragment>", "float e3dBase = max(dot(diffuseColor.rgb, vec3(0.299, 0.587, 0.114)), 1e-3);\nfloat e3dShade = dot(outgoingLight, vec3(0.299, 0.587, 0.114)) / e3dBase;\nvec2 e3dP = gl_FragCoord.xy;\nfloat e3dL1 = step(0.6, fract((e3dP.x + e3dP.y) / 5.0 + 0.18 * sin(e3dP.y * 0.37)));\nfloat e3dL2 = step(0.62, fract((e3dP.x - e3dP.y) / 6.0 + 0.18 * sin(e3dP.x * 0.41)));\nfloat e3dG = fract(sin(dot(floor(e3dP), vec2(12.9898, 78.233))) * 43758.5453);\nif (e3dShade < 0.8) outgoingLight *= 1.0 - 0.16 * e3dL1;\nif (e3dShade < 0.5) outgoingLight *= 1.0 - 0.16 * e3dL2;\noutgoingLight *= 1.0 - 0.045 * e3dG;\n#include <opaque_fragment>");
  };
  return mat;
}
let GRAD = null;
function gradient() { // three-step toon shading
  if (!GRAD) { GRAD = new THREE.DataTexture(new Uint8Array([90, 90, 90, 255, 170, 170, 170, 255, 255, 255, 255, 255]), 3, 1); GRAD.minFilter = GRAD.magFilter = THREE.NearestFilter; GRAD.needsUpdate = true; }
  return GRAD;
}
export function toon(mesh, color) {
  mesh.material = hatch(new THREE.MeshToonMaterial({ color, gradientMap: gradient() }));
  mesh.receiveShadow = true;
  mesh.castShadow = true;
  const ink = new THREE.Mesh(mesh.geometry, inkMaterial());
  ink.castShadow = false;
  ink.raycast = () => {};
  ink.userData.ink = true;
  ink.userData.noFit = true;
  mesh.add(ink);
  return mesh;
}
function grain(dark) {
  if (!hasDoc()) return null;
  const c = document.createElement("canvas"); c.width = c.height = 128; const x = c.getContext("2d"); if (!x) return null;
  x.fillStyle = dark ? "#1F1D1A" : "#FBF6EA"; x.fillRect(0, 0, 128, 128);
  for (let i = 0; i < 1400; i++) { const v = Math.random(); x.fillStyle = dark ? `rgba(237,230,214,${0.03 + v * 0.04})` : `rgba(43,38,34,${0.03 + v * 0.05})`; x.fillRect(Math.random() * 128, Math.random() * 128, 1 + v, 1); }
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; t.wrapS = t.wrapT = THREE.RepeatWrapping; t.repeat.set(40, 40); return t; // sRGB, or the ground washes out to #FCFAF5
}

export function createEnergyScene(host, opts = {}) {
  if (opts.portrait && (host.clientHeight > host.clientWidth * 0.9 || (host.clientWidth || innerWidth) < 600)) opts = { ...opts, ...opts.portrait }; // phones: tall stage, sheet gives an alternate camera
  if (!hasDoc() || !webgl()) return null;
  opts.reduce = opts.reduce ?? reduced();
  const dark = isDark();
  let renderer;
  try { renderer = new THREE.WebGLRenderer({ antialias: true }); } catch { return null; }
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFShadowMap; // PCF with radius 4 (PCFSoft ignores radius)
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
  renderer.domElement.style.touchAction = "none";
  renderer.domElement.style.pointerEvents = "auto"; // .p-scene is pointer-events:none, so the canvas opts back in for drags
  if (!document.getElementById("e3d-css")) { const st = document.createElement("style"); st.id = "e3d-css"; st.textContent = ".e3d-ui select,.e3d-ui button,.e3d-ui input,.e3d-ui option{font:inherit}"; document.head.appendChild(st); }
  host.appendChild(renderer.domElement);

  const scene = new THREE.Scene(); scene.userData.host = host; // ui.js meters find their HUD through the scene
  scene.background = new THREE.Color(dark ? "#1F1D1A" : "#FBF6EA");
  const camera = new THREE.PerspectiveCamera(opts.fov || 40, 16 / 9, 0.1, 100);
  camera.position.fromArray(opts.camera || [0, 5, 9]);
  camera.lookAt(new THREE.Vector3().fromArray(opts.target || [0, 1, 0]));

  const sun = new THREE.DirectionalLight(0xFFF4E0, dark ? 1.8 : 2.2);
  sun.position.set(-6, 10, 6); // prop sheets: one warm key, upper left
  sun.castShadow = true;
  sun.shadow.mapSize.set(2048, 2048);
  sun.shadow.bias = -0.0002; sun.shadow.radius = 4;
  sun.shadow.normalBias = 0.03; // keeps thin tracks from peter-panning or acne
  Object.assign(sun.shadow.camera, { left: -6, right: 6, top: 6, bottom: -6, near: 0.5, far: 25 });
  scene.add(sun, new THREE.HemisphereLight(dark ? 0x4A4236 : 0xFFF1DC, dark ? 0x1F1D1A : 0xD9CBB0, 0.45));

  // paper ground (unlit) plus a shadow catcher, so shadows are warm (#CFC3A8 light, #141210 dark), never grey
  const ground = new THREE.Mesh(new THREE.PlaneGeometry(60, 60), new THREE.MeshBasicMaterial({ color: "#FFFFFF", map: grain(dark) }));
  if (!ground.material.map) ground.material.color.set(dark ? "#1F1D1A" : "#FBF6EA");
  ground.rotation.x = -Math.PI / 2;
  ground.userData.noFit = true;
  scene.add(ground);
  const catcher = new THREE.Mesh(new THREE.PlaneGeometry(60, 60), new THREE.ShadowMaterial({ color: dark ? "#141210" : "#CFC3A8", opacity: dark ? 0.9 : 0.85 }));
  catcher.rotation.x = -Math.PI / 2; catcher.position.y = 0.001; catcher.receiveShadow = true; catcher.userData.noFit = true;
  scene.add(catcher);

  const frames = new Set(), drags = [], cleanups = [];
  const ray = new THREE.Raycaster(), ndc = new THREE.Vector2(), hit = new THREE.Vector3();
  const el = renderer.domElement;
  let active = null;
  const toNdc = (e) => {
    const r = el.getBoundingClientRect();
    ndc.set(((e.clientX - r.left) / r.width) * 2 - 1, -((e.clientY - r.top) / r.height) * 2 + 1);
    ray.setFromCamera(ndc, camera);
  };
  const AX = { x: new THREE.Vector3(1, 0, 0), y: new THREE.Vector3(0, 1, 0), z: new THREE.Vector3(0, 0, 1) };
  function down(e) {
    toNdc(e);
    const hits = ray.intersectObjects(drags.map((d) => d.mesh), true);
    let d = hits.length ? drags.find((d) => { let o = hits[0].object; while (o) { if (o === d.mesh) return true; o = o.parent; } return false; }) : null;
    let point = hits[0]?.point;
    if (!d) { // invisible hit area: at least 44x44 CSS px around each handle's centre
      const r = el.getBoundingClientRect(); let best = HIT / 2 + 1;
      for (const c of drags) { const p = screenOf(c.mesh); if (!p) continue; const dx = Math.abs(p.x - (e.clientX - r.left)), dy = Math.abs(p.y - (e.clientY - r.top)); if (dx <= HIT / 2 && dy <= HIT / 2 && Math.max(dx, dy) < best) { best = Math.max(dx, dy); d = c; } }
      if (!d) return;
      point = d.mesh.getWorldPosition(new THREE.Vector3());
    }
    if (d.axis === "xz") { // floor drag: horizontal plane through the grab point, min/max are [x, z] pairs
      const plane = new THREE.Plane(new THREE.Vector3(0, 1, 0), -point.y);
      if (!ray.ray.intersectPlane(plane, hit)) return;
      active = { d, plane, off: [d.mesh.position.x - hit.x, d.mesh.position.z - hit.z] };
      el.setPointerCapture?.(e.pointerId); e.preventDefault(); return;
    }
    const axis = AX[d.axis] || AX.x;
    // plane containing the axis, facing the camera as much as possible
    const view = camera.getWorldDirection(new THREE.Vector3());
    const n = view.clone().sub(axis.clone().multiplyScalar(view.dot(axis)));
    if (n.lengthSq() < 1e-6) n.copy(axis.x ? AX.z : AX.x);
    const plane = new THREE.Plane().setFromNormalAndCoplanarPoint(n.normalize(), point);
    if (!ray.ray.intersectPlane(plane, hit)) return;
    active = { d, plane, start: d.mesh.position[d.axis] - hit.dot(axis), axis };
    el.setPointerCapture?.(e.pointerId);
    e.preventDefault();
  }
  function move(e) {
    if (!active) return;
    toNdc(e);
    if (!ray.ray.intersectPlane(active.plane, hit)) return;
    const { d } = active;
    if (d.axis === "xz") {
      const mn = Array.isArray(d.min) ? d.min : [-Infinity, -Infinity], mx = Array.isArray(d.max) ? d.max : [Infinity, Infinity];
      d.mesh.position.x = clamp(hit.x + active.off[0], mn[0], mx[0]); d.mesh.position.z = clamp(hit.z + active.off[1], mn[1], mx[1]);
      d.onMove?.(d.mesh.position, d.mesh); return;
    }
    const v = clamp(active.start + hit.dot(active.axis), d.min, d.max);
    d.mesh.position[d.axis] = v;
    d.onMove?.(v, d.mesh);
  }
  const up = () => { if (active) active.d.onUp?.(active.d.mesh); active = null; };
  el.addEventListener("pointerdown", down);
  el.addEventListener("pointermove", move);
  el.addEventListener("pointerup", up);
  el.addEventListener("pointercancel", up);

  // Drag handles: a 44x44 px invisible hit area plus a visible ring (28 px desktop, 44 px mobile).
  const HIT = 44;
  const mobile = () => (host.clientWidth || innerWidth) < 600 || matchMedia?.("(pointer: coarse)").matches;
  const _v = new THREE.Vector3();
  function screenOf(mesh) {
    if (!mesh.visible) return null;
    mesh.getWorldPosition(_v).project(camera);
    if (_v.z > 1) return null;
    return { x: (_v.x + 1) / 2 * el.clientWidth, y: (1 - _v.y) / 2 * el.clientHeight };
  }
  function addDrag(mesh, { axis = "x", min = -Infinity, max = Infinity, onMove, onUp } = {}) {
    const ring = document.createElement("div");
    ring.className = "e3d-handle"; ring.setAttribute("aria-hidden", "true");
    ring.style.cssText = "position:absolute;pointer-events:none;border-radius:50%;box-sizing:border-box;transform:translate(-50%,-50%);border:3px solid " + (dark ? "#EDE6D6" : "#2B2622");
    host.appendChild(ring);
    const d = { mesh, axis, min, max, onMove, onUp, ring };
    drags.push(d);
    return () => { ring.remove(); drags.splice(drags.indexOf(d), 1); };
  }
  // Callout labels (prop sheets): any object with userData.label gets a cream card, ink text and a leader to a dot on the object.
  // userData.labelPos: above | above-left | above-right | left | right | below | on. userData.labelAnchor: local Vector3 (default: box top centre).
  const tags = new Map();
  const svg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
  svg.setAttribute("aria-hidden", "true"); svg.style.cssText = "position:absolute;inset:0;width:100%;height:100%;pointer-events:none;overflow:visible";
  host.appendChild(svg);
  const DIRS = { above: [0, -1], "above-left": [-0.8, -0.8], "above-right": [0.8, -0.8], left: [-1, 0], right: [1, 0], below: [0, 1], "below-left": [-0.8, 0.8], "below-right": [0.8, 0.8], on: [0, 0] };
  const _a = new THREE.Vector3(), _b = new THREE.Box3();
  function placeTags() {
    const W = el.clientWidth, H = el.clientHeight, compact = W < 600, ink = "#2B2622";
    scene.traverse((o) => {
      if (!o.userData.label || tags.has(o)) return;
      const d = document.createElement("div"); d.className = "e3d-tag";
      d.style.cssText = `position:absolute;left:0;top:0;font:16px/1.15 'Patrick Hand','Gochi Hand',cursive;font-variant-numeric:tabular-nums;padding:2px 7px;border-radius:7px;pointer-events:none;white-space:nowrap;color:${ink};background:#FFFDF5;border:1.5px solid ${ink};box-shadow:1px 2px 0 rgba(43,38,34,.18)`;
      host.appendChild(d);
      const line = document.createElementNS("http://www.w3.org/2000/svg", "line"); line.setAttribute("stroke", dark ? "#EDE6D6" : ink); line.setAttribute("stroke-width", "1.75");
      const dot = document.createElementNS("http://www.w3.org/2000/svg", "circle"); dot.setAttribute("r", "2.5"); dot.setAttribute("fill", dark ? "#EDE6D6" : ink);
      svg.append(line, dot); tags.set(o, { d, line, dot });
    });
    const placed = []; // Jasper is an obstacle: callouts never sit on him
    const hr = host.getBoundingClientRect();
    for (const j of host.querySelectorAll(":scope > .e3d-jasper, :scope > .e3d-hud, :scope > .e3d-meters")) { const r = j.getBoundingClientRect(); if (r.width) placed.push({ L: r.left - hr.left, T: r.top - hr.top, R: r.right - hr.left, B: r.bottom - hr.top }); }
    const order = [...tags].sort((a, b) => (b[0].userData.labelPos === "on") - (a[0].userData.labelPos === "on")); // on-object names claim their spot first
    for (const [o, t] of order) {
      let vis = !!o.parent; for (let q = o; q && vis; q = q.parent) vis = q.visible;
      if (W < 600 && o.userData.labelPosMobile === "none") vis = false; // phones: some callouts move to the panel
      if (!vis || !o.userData.label) { t.d.style.display = "none"; t.line.style.display = t.dot.style.display = "none"; continue; }
      if (o.userData.labelAnchor) _a.copy(o.userData.labelAnchor).applyMatrix4(o.matrixWorld);
      else { _b.setFromObject(o); _a.set((_b.min.x + _b.max.x) / 2, _b.max.y, (_b.min.z + _b.max.z) / 2); }
      _a.project(camera);
      if (!Number.isFinite(_a.x) || !Number.isFinite(_a.y) || !Number.isFinite(_a.z) || _a.z > 1) {
        t.d.style.display = "none"; t.line.style.display = t.dot.style.display = "none"; continue;
      } // a swapping/empty prop has no screen anchor until its next finite world bounds

      const ax = (_a.x + 1) / 2 * W, ay = (1 - _a.y) / 2 * H;
      t.d.style.display = ""; if (t.d.textContent !== o.userData.label) t.d.textContent = o.userData.label;
      const pos = (compact && o.userData.labelPosMobile) || o.userData.labelPos || "above", [dx, dy] = DIRS[pos] || DIRS.above, gap = pos === "on" ? 0 : (compact ? 26 : 38) * (o.userData.labelGap || 1);
      const w = t.d.offsetWidth, h = t.d.offsetHeight;
      const L0 = ax + dx * gap - w / 2 + dx * w / 2, T0 = ay + dy * gap - h / 2 + dy * h / 2;
      const clampR = (l, tt) => [Math.max(2, Math.min(W - w - 2, l)), Math.max(2, Math.min(H - h - 2, tt))];
      const free = ([l, tt]) => !placed.some((r) => l < r.R + 3 && l + w > r.L - 3 && tt < r.B + 3 && tt + h > r.T - 3);
      // collision: try stepping out along the leader, then straight up or down, then sideways; first free slot wins
      let L, T, best = clampR(L0, T0);
      if (pos === "on") best = clampR(L0, T0); else
      search: for (let k = 0; k < 10; k++) for (const [sx, sy] of [[dx, dy || 1], [0, -1], [0, 1], [-1, 0], [1, 0]]) {
        const c = clampR(L0 + sx * k * (w * 0.35), T0 + sy * k * (h + 4) * 0.6);
        if (free(c)) { best = c; break search; }
      }
      [L, T] = best;
      placed.push({ L, T, R: L + w, B: T + h });
      t.d.style.transform = `translate(${L}px,${T}px)`;
      const show = pos !== "on"; t.line.style.display = t.dot.style.display = show ? "" : "none";
      if (show) { const ex = Math.max(L, Math.min(L + w, ax)), ey = Math.max(T, Math.min(T + h, ay)); t.line.setAttribute("x1", ax); t.line.setAttribute("y1", ay); t.line.setAttribute("x2", ex); t.line.setAttribute("y2", ey); t.dot.setAttribute("cx", ax); t.dot.setAttribute("cy", ay); }
    }
  }
  function placeRings() {
    const s = mobile() ? 44 : 28;
    for (const d of drags) { const p = screenOf(d.mesh); d.ring.style.display = p ? "" : "none"; if (p) Object.assign(d.ring.style, { left: p.x + "px", top: p.y + "px", width: s + "px", height: s + "px" }); }
  }
  function onFrame(fn) { frames.add(fn); return () => frames.delete(fn); }
  function resize() {
    const w = host.clientWidth || 800, h = host.clientHeight || 450;
    renderer.setSize(w, h, false);
    el.style.width = "100%"; el.style.height = "100%";
    INK_RES.value.set(w, h);
    camera.aspect = w / h;
    camera.updateProjectionMatrix();
    if (fitted) fit();
  }
  // Frame everything the scene built (not the ground) for the current aspect, keeping the view direction.
  let fitted = false;
  const dir0 = new THREE.Vector3().fromArray(opts.camera || [0, 5, 9]).sub(new THREE.Vector3().fromArray(opts.target || [0, 1, 0])).normalize();
  // Sample world-space vertices of everything that counts for framing (not the ground, not noFit).
  function samples() {
    const pts = [], v = new THREE.Vector3();
    scene.updateMatrixWorld(true);
    scene.traverse((o) => {
      if (!o.isMesh || o.userData.noFit || !o.visible || o.parent?.visible === false || o.material?.visible === false) return;
      const pos = o.geometry?.attributes?.position; if (!pos) return;
      const step = Math.max(1, Math.floor(pos.count / 60));
      for (let i = 0; i < pos.count; i += step) pts.push(v.fromBufferAttribute(pos, i).applyMatrix4(o.matrixWorld).clone());
    });
    return pts;
  }
  // Projected extent of the samples: half-spans and centre in NDC, plus whether anything is behind or clipped.
  function extent(pts) {
    camera.updateMatrixWorld(); camera.matrixWorldInverse.copy(camera.matrixWorld).invert();
    let x0 = 9, x1 = -9, y0 = 9, y1 = -9, bad = false; const q = new THREE.Vector3();
    for (const p of pts) { q.copy(p).project(camera); if (q.z >= 1 || q.z <= -1) bad = true; x0 = Math.min(x0, q.x); x1 = Math.max(x1, q.x); y0 = Math.min(y0, q.y); y1 = Math.max(y1, q.y); }
    return { w: (x1 - x0) / 2, h: (y1 - y0) / 2, cx: (x0 + x1) / 2, cy: (y0 + y1) / 2, bad, clip: x0 < -0.97 || x1 > 0.97 || y0 < -0.97 || y1 > 0.97 };
  }
  // Leo's sheet camera first; auto-fit only if it clips the setup or misses the 55 to 75 percent fill.
  const FILL = opts.fill || 0.66;
  const tgt0 = new THREE.Vector3().fromArray(opts.target || [0, 1, 0]);
  let mode = "";
  function fit() {
    fitted = true;
    camera.zoom = 1; camera.clearViewOffset(); camera.updateProjectionMatrix();
    const pts = samples(); if (!pts.length) return;
    try { fitCore(pts); } finally { clearHud(); }
  }
  // Desktop: keep the props in the band between the Setup card (left) and the meters panel (right):
  // shrink by the band's share of the width and shift the view so the scene centres in the band.
  function clearHud() {
    const W = el.clientWidth, H = el.clientHeight; if (!H) return; const phone = W < 600; // round 2: phones keep the HUD in the stage, so they clear it too
    const pts = samples(); if (!pts.length) return;
    const e = extent(pts), bw = e.w * W / 2, bh = e.h * H / 2, cx = (e.cx + 1) / 2 * W, cy = (1 - e.cy) / 2 * H; // props box in px
    const hr = el.getBoundingClientRect(); let L = 0, R = W, T = 0, B = H, hit = false;
    for (const n of host.querySelectorAll(":scope > .e3d-inspector, :scope > .e3d-meters, :scope > .e3d-jasper, :scope > .e3d-inset, :scope > .e3d-fixedbar")) {
      const r0 = n.getBoundingClientRect(); if (!r0.width || (phone && r0.width < W * 0.5)) continue;
      const r = { l: r0.left - hr.left, r: r0.right - hr.left, t: r0.top - hr.top, b: r0.bottom - hr.top };
      if (r.r < cx - bw - 10 || r.l > cx + bw + 10 || r.b < cy - bh - 10 || r.t > cy + bh + 10) continue; // clear of the props
      hit = true;
      if (r.r - r.l > W * 0.5) { if ((r.t + r.b) / 2 > cy) B = Math.min(B, r.t - 10); else T = Math.max(T, r.b + 10); }
      else { // side card: either keep the props beside it or slide them above/below it, whichever keeps them bigger
        const left = (r.l + r.r) / 2 < cx, zH = (left ? W - r.r - 10 : r.l - 10) / (bw * 2), up = (r.t + r.b) / 2 < cy, zV = (up ? H - r.b - 10 : r.t - 10) / (bh * 2);
        if (zV > zH) { if (up) T = Math.max(T, r.b + 10); else B = Math.min(B, r.t - 10); }
        else if (left) L = Math.max(L, r.r + 10); else R = Math.min(R, r.l - 10);
      }
    }
    if (!hit || R - L < W * 0.3 || B - T < H * 0.3) return;
    const z = Math.min(1, (R - L) / (bw * 2), (B - T) / (bh * 2)); // bw, bh are half-spans
    const nx = Math.max(L + bw * z, Math.min(R - bw * z, W / 2 + (cx - W / 2) * z)), ny = Math.max(T + bh * z, Math.min(B - bh * z, H / 2 + (cy - H / 2) * z));
    const dx = nx - (W / 2 + (cx - W / 2) * z), dy = ny - (H / 2 + (cy - H / 2) * z);
    camera.zoom = z; camera.setViewOffset(W, H, -dx, -dy, W, H); camera.updateProjectionMatrix();
    host.dataset.e3dBand = `${Math.round(L)}-${Math.round(R)}x${Math.round(T)}-${Math.round(B)}`;
  }
  function fitCore(pts) {
    camera.position.fromArray(opts.camera || [0, 5, 9]); camera.lookAt(tgt0);
    const e0 = extent(pts), f0 = Math.max(e0.w, e0.h);
    if (!e0.bad && !e0.clip && f0 >= 0.55 && f0 <= 0.8 && Math.abs(e0.cx) < 0.25 && Math.abs(e0.cy) < 0.25) { mode = "sheet"; host.dataset.e3dCam = mode; host.dataset.e3dFill = f0.toFixed(2); return; }
    mode = "fit";
    const box = new THREE.Box3(); for (const p of pts) box.expandByPoint(p);
    const sph = box.getBoundingSphere(new THREE.Sphere()), centre = sph.center.clone();
    const v = THREE.MathUtils.degToRad(camera.fov), hz = 2 * Math.atan(Math.tan(v / 2) * camera.aspect);
    const d0 = (sph.radius * 1.05) / Math.sin(Math.min(v, hz) / 2);
    const place = (dist) => { camera.position.copy(centre).addScaledVector(dir0, dist); camera.lookAt(centre); return extent(pts); };
    let e;
    for (let pass = 0; pass < 3; pass++) {
      let lo = d0 * 0.15, hi = d0 * 1.2;
      for (let i = 0; i < 16; i++) { const mid = (lo + hi) / 2, m = place(mid); if (!m.bad && Math.max(m.w + Math.abs(m.cx), m.h + Math.abs(m.cy)) <= FILL + 0.02 && Math.max(m.w, m.h) <= FILL) hi = mid; else lo = mid; }
      e = place(hi);
      // recentre on the projected silhouette, not the bounding-sphere centre
      const dist = hi, halfH = Math.tan(v / 2) * dist, halfW = halfH * camera.aspect;
      const right = new THREE.Vector3().setFromMatrixColumn(camera.matrixWorld, 0), up = new THREE.Vector3().setFromMatrixColumn(camera.matrixWorld, 1);
      centre.addScaledVector(right, e.cx * halfW).addScaledVector(up, e.cy * halfH);
    }
    e = place(camera.position.distanceTo(centre));
    host.dataset.e3dCam = mode; host.dataset.e3dFill = Math.max(e.w, e.h).toFixed(2);
  }
  resize();
  const ro = typeof ResizeObserver !== "undefined" ? new ResizeObserver(resize) : null;
  ro?.observe(host);

  let raf = 0, last = 0, disposed = false;
  function tick(t) {
    raf = 0;
    if (disposed || document.hidden) return;
    const dt = last ? Math.min((t - last) / 1000, 0.05) : 0;
    last = t;
    for (const fn of frames) fn(dt, t / 1000);
    if (!fitted) fit();
    renderer.render(scene, camera);
    placeRings(); placeTags();
    raf = requestAnimationFrame(tick);
  }
  const vis = () => { if (!document.hidden && !raf && !disposed) { last = 0; raf = requestAnimationFrame(tick); } };
  document.addEventListener("visibilitychange", vis);
  raf = requestAnimationFrame(tick);

  function dispose() {
    for (const r of [host, host.e3dPanel]) r?.querySelectorAll(".e3d-meters, .e3d-inspector").forEach((n) => n.remove()); delete host.e3dMeters;
    disposed = true;
    if (raf) cancelAnimationFrame(raf);
    ro?.disconnect();
    document.removeEventListener("visibilitychange", vis);
    el.removeEventListener("pointerdown", down);
    el.removeEventListener("pointermove", move);
    el.removeEventListener("pointerup", up);
    el.removeEventListener("pointercancel", up);
    cleanups.forEach((f) => f());
    scene.traverse((o) => {
      o.geometry?.dispose();
      [].concat(o.material || []).forEach((m) => m.dispose());
    });
    renderer.dispose();
    el.remove();
    frames.clear();
    drags.forEach((d) => d.ring.remove()); drags.length = 0; tags.forEach((t) => t.d.remove()); tags.clear(); svg.remove();
  }
  return { THREE, scene, camera, renderer, palette, reduce: !!opts.reduce, addDrag, onFrame, resize, fit, dispose };
}
