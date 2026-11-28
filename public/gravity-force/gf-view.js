// Gravity Force Lab VR: the 3D scenes. Lab coordinates are real metres: the student stands at the origin, looking
// down -Z, floor at y = 0 (WebXR local-floor). The flat page renders the same world from a fixed camera per scene.
import { GF, wellDepth, stepMarble } from "./gf-sim.js";
import { S1, S2, S4, SHEET, SCENE_WORLDS, WORLD_NAME, OBJ_NAME, s4Height, needleAngleDeg, stepSheet } from "./gf-scenes.js";
import { SORT_CARDS, pretty } from "./gf-scenes.js";
import { springScale, balance, traveler, robot, station, stepPlatform, loadModel, cloneModel, rigSpringScaleGLB, rigBalanceGLB, PROP_SIZE, ROBOT, INK, CREAM } from "./gf-props.js";
import { paintUniforms, paintTree, outlineMaterial, skipOutline, FatLine, PAINT } from "./gf-paint.js";

const FONT = (px, w = 600) => `${w} ${px}px Inter, -apple-system, system-ui, sans-serif`;
export const ARROW = { color: 0x2A2420, ghost: 0x6B6158, radius: 0.011, head: 0.045 };
export const VIEWS = {   // flat-screen cameras, framed for a 16:10 stage; gf-main pulls back on narrower stages
  pull: { pos: [0, 1.42, 0.72], target: [0.08, 1.05, -1.15], fov: 46 },
  mass: { pos: [0, 1.5, 0.35], target: [0, 1.12, -1.2], fov: 44 },
  weigh: { pos: [0, 1.55, 0.9], target: [0, 0.72, -1.6], fov: 44 },
  iss: { pos: [-0.4, 1.45, 1.9], target: [0.2, 1.3, -1.4], fov: 50 },
  issStation: { pos: [0, 1.35, -0.3], target: [0, 1.25, -1.5], fov: 44 },
  well: { pos: [0, 1.95, 0.35], target: [0, 0.9, -1.15], fov: 46 },
  sort: { pos: [0, 1.55, 0.3], target: [0, 1.0, -1.0], fov: 46 },
};
/** Label text size: Leo's round 1 review. Flat screens: at least 14 CSS px (16 on wider screens). Headset: the same
 * angular size as 56 px on the 1280 px per metre panel at 1.2 m, so 0.0365 m of text per metre of distance. Labels are
 * sized every frame from their distance, so they never shrink as the camera pulls back. */
export const LABEL = { phonePx: 15, deskPx: 16, xrPerM: 56 / 1280 / 1.2, bg: CREAM, ink: INK, fontPx: 64 };
export const S3_X = (i) => (i - 2) * 0.62;

export class LabView {
  constructor(THREE) {
    this.T = THREE; this.root = new THREE.Group(); this.labels = []; this.t = 0;
    this.U = paintUniforms(THREE); this.calm = false;
    this.groups = {}; for (const k of ["pull", "mass", "weigh", "iss", "well", "sort"]) { const g = new THREE.Group(); g.name = k; g.visible = false; this.groups[k] = g; this.root.add(g); }
    this.common(); this.buildPull(); this.buildMass(); this.buildWeigh(); this.buildIss(); this.buildWell(); this.buildSort();
    paintTree(THREE, this.root, this.U);
    this.swapGLB();
  }
  // ---------------- helpers ----------------
  mat(color, o = {}) { return new this.T.MeshLambertMaterial({ color, ...o }); }
  /** One label style everywhere: a cream pill with warm ink Inter semibold (Leo). Size is set per frame in update(). */
  label(text) {
    const T = this.T; const c = document.createElement("canvas"); const g = c.getContext("2d");
    const mk = () => { const t = new T.CanvasTexture(c); t.colorSpace = T.SRGBColorSpace; t.minFilter = T.LinearFilter; t.generateMipmaps = false; return t; };
    const mesh = new T.Mesh(new T.PlaneGeometry(1, 1), new T.MeshBasicMaterial({ map: mk(), transparent: true, depthWrite: false, depthTest: false, toneMapped: false }));
    mesh.renderOrder = 30; mesh.userData = { text: null, set: null, label: true, noPaint: true, w: 1, h: 1 };
    const set = (t) => {
      if (t === mesh.userData.text) return; mesh.userData.text = t; mesh.material.opacity = t === "" ? 0 : 1;
      const px = LABEL.fontPx; const lines = String(t).split("\n"); g.font = FONT(px, 600);
      const w = Math.max(...lines.map((l) => g.measureText(l).width)) + px * 0.9; const h = lines.length * px * 1.22 + px * 0.5;
      const nw = Math.ceil(w), nh = Math.ceil(h); if (nw !== c.width || nh !== c.height) { c.width = nw; c.height = nh; mesh.material.map.dispose(); mesh.material.map = mk(); }
      g.clearRect(0, 0, c.width, c.height); const rr = Math.min(c.height / 2, px * 0.62);
      g.fillStyle = LABEL.bg; g.beginPath(); g.roundRect ? g.roundRect(1, 1, c.width - 2, c.height - 2, rr) : g.rect(1, 1, c.width - 2, c.height - 2); g.fill();
      g.strokeStyle = "rgba(42,36,32,0.35)"; g.lineWidth = 2; g.stroke();
      g.font = FONT(px, 600); if ("fontVariantNumeric" in g) g.fontVariantNumeric = "tabular-nums";
      g.fillStyle = LABEL.ink; g.textAlign = "center"; g.textBaseline = "middle";
      lines.forEach((l, i) => g.fillText(l, c.width / 2, px * 0.25 + px * 0.61 + i * px * 1.22));
      mesh.material.map.needsUpdate = true; mesh.userData.w = c.width; mesh.userData.h = c.height;
    };
    mesh.userData.set = set; set(text); this.labels.push(mesh); return mesh;
  }
  arrow(color = ARROW.color, ghost = false) {
    const T = this.T; const g = new T.Group();
    const m = new T.MeshBasicMaterial({ color, toneMapped: false });
    const shaft = new T.Mesh(new T.CylinderGeometry(ARROW.radius, ARROW.radius, 1, 18), m); shaft.rotation.z = -Math.PI / 2;
    const cap = new T.Mesh(new T.SphereGeometry(ARROW.radius, 14, 10), m);
    const head = new T.Mesh(new T.ConeGeometry(ARROW.radius * 2.3, ARROW.head, 20), m); head.rotation.z = -Math.PI / 2;
    const tip = new T.Mesh(new T.ConeGeometry(ARROW.radius * 1.4, ARROW.head * 0.7, 16), m); tip.rotation.z = -Math.PI / 2; tip.visible = false;
    g.add(shaft, cap, head, tip);
    g.userData.setLength = (L, keeps = false) => {   // L includes the head; fixed cross-section, only the length changes
      const hl = Math.min(ARROW.head, L * 0.6); const sl = Math.max(0.0005, L - hl);
      shaft.scale.y = sl; shaft.position.x = sl / 2; head.scale.set(hl / ARROW.head, hl / ARROW.head, hl / ARROW.head); head.position.x = sl + hl / 2;
      tip.visible = keeps; tip.position.x = L + ARROW.head * 0.55;
    };
    g.userData.setLength(0.2); return g;
  }
  sphereTex(kind) {
    const T = this.T; const c = document.createElement("canvas"); c.width = 512; c.height = 256; const g = c.getContext("2d");
    const rnd = mulberry(kind.length * 977 + 13);
    const base = { earth: "#2F6FB5", moon: "#9A9AA2", mars: "#B5573A", jupiter: "#C9A27A", sun: "#FFC867", wd: "#E8F0FF", ball: "#2B2E4A", ns: "#CFE3FF", A: "#8FB0E8", B: "#E2B27C" }[kind] || "#888";
    g.fillStyle = base; g.fillRect(0, 0, 512, 256);
    if (kind === "earth") { for (let i = 0; i < 26; i++) { g.fillStyle = rnd() < 0.7 ? "#4E8A4A" : "#C8B57E"; g.beginPath(); g.ellipse(rnd() * 512, 40 + rnd() * 176, 20 + rnd() * 50, 10 + rnd() * 26, rnd() * 3, 0, 7); g.fill(); } g.fillStyle = "rgba(255,255,255,0.55)"; for (let i = 0; i < 30; i++) { g.beginPath(); g.ellipse(rnd() * 512, rnd() * 256, 18 + rnd() * 40, 3 + rnd() * 5, 0, 0, 7); g.fill(); } g.fillStyle = "#F4F6FA"; g.fillRect(0, 0, 512, 14); g.fillRect(0, 242, 512, 14); }
    else if (kind === "moon") { for (let i = 0; i < 40; i++) { g.fillStyle = rnd() < 0.5 ? "#7E7E88" : "#B4B4BC"; g.beginPath(); g.arc(rnd() * 512, rnd() * 256, 4 + rnd() * 18, 0, 7); g.fill(); } }
    else if (kind === "jupiter") { for (let y = 0; y < 256; y += 8) { g.fillStyle = ["#D9B48A", "#B8835A", "#E8D2B0", "#A8714A"][Math.floor(rnd() * 4)]; g.fillRect(0, y, 512, 8 + rnd() * 6); } }
    else if (kind === "mars") { for (let i = 0; i < 30; i++) { g.fillStyle = rnd() < 0.5 ? "#8E3E28" : "#CF7A52"; g.beginPath(); g.ellipse(rnd() * 512, rnd() * 256, 10 + rnd() * 40, 6 + rnd() * 16, rnd() * 3, 0, 7); g.fill(); } }
    else if (kind === "sun") { for (let i = 0; i < 300; i++) { g.fillStyle = rnd() < 0.5 ? "#FFB347" : "#FFE39A"; g.fillRect(rnd() * 512, rnd() * 256, 3, 3); } }
    const t = new T.CanvasTexture(c); t.colorSpace = T.SRGBColorSpace; return t;
  }
  body(kind, r) {
    const T = this.T; const glow = kind === "sun" || kind === "wd" || kind === "ns";
    const m = glow ? new T.MeshBasicMaterial({ map: this.sphereTex(kind) }) : new T.MeshLambertMaterial({ map: this.sphereTex(kind) });
    const s = new T.Mesh(new T.SphereGeometry(r, 40, 24), m); s.userData.kind = kind; return s;
  }
  common() {
    const T = this.T;
    // sky dome: style B navy to violet wash, with stars
    const dome = new T.Mesh(new T.SphereGeometry(60, 32, 16), new T.ShaderMaterial({ side: T.BackSide, depthWrite: false, uniforms: {},
      vertexShader: "varying vec3 vP; void main(){ vP = normalize(position); gl_Position = projectionMatrix * modelViewMatrix * vec4(position,1.0); }",
      fragmentShader: "varying vec3 vP; void main(){ float h = clamp(vP.y*0.5+0.5,0.0,1.0); vec3 a = vec3(0.016,0.031,0.102); vec3 b = vec3(0.047,0.078,0.227); vec3 c = vec3(0.18,0.118,0.36); vec3 col = mix(c, mix(b, a, smoothstep(0.55,1.0,h)), smoothstep(0.25,0.6,h)); gl_FragColor = vec4(col,1.0); }" }));
    dome.renderOrder = -10; this.root.add(dome);
    const rnd = mulberry(7); const pos = [];
    for (let i = 0; i < 1400; i++) { const u = rnd() * 2 - 1, th = rnd() * Math.PI * 2, s = Math.sqrt(1 - u * u); if (u < -0.15) continue; pos.push(50 * s * Math.cos(th), 50 * u, 50 * s * Math.sin(th)); }
    const sg = new T.BufferGeometry(); sg.setAttribute("position", new T.Float32BufferAttribute(pos, 3));
    this.root.add(new T.Points(sg, new T.PointsMaterial({ color: 0xE6E9F8, size: 0.09, sizeAttenuation: true, transparent: true, opacity: 0.8, depthWrite: false })));
    const ring = new T.Mesh(new T.RingGeometry(1.55, 1.6, 96), new T.MeshBasicMaterial({ color: 0x7FB2FF, transparent: true, opacity: 0.35, side: T.DoubleSide })); ring.rotation.x = -Math.PI / 2; ring.position.y = 0.002; this.root.add(ring);
    const floor = new T.Mesh(new T.CircleGeometry(1.55, 64), new T.MeshBasicMaterial({ color: 0x0C143A, transparent: true, opacity: 0.55 })); floor.rotation.x = -Math.PI / 2; floor.position.y = 0.001; this.floor = floor; this.root.add(floor);
    this.root.add(new T.HemisphereLight(0xE8ECFF, 0x2E1E5C, 1.6)); const key = new T.DirectionalLight(0xFFF1DC, 1.6); key.position.set(-1.5, 3, 1.5); this.root.add(key);
  }
  bench(g, w, d, y, z) {
    const T = this.T; const top = new T.Mesh(new T.BoxGeometry(w, 0.04, d), this.mat(0x5A6498)); top.position.set(0, y - 0.02, z); g.add(top);
    for (const sx of [-1, 1]) for (const sz of [-1, 1]) { const leg = new T.Mesh(new T.BoxGeometry(0.04, y - 0.04, 0.04), this.mat(0x3E4A7A)); leg.position.set(sx * (w / 2 - 0.05), (y - 0.04) / 2, z + sz * (d / 2 - 0.05)); g.add(leg); }
  }
  // ---------------- S1 Pull Meter ----------------
  buildPull() {
    const T = this.T, g = this.groups.pull; const y = 1.0, z = -1.15, x0 = -0.78;
    this.bench(g, 1.8, 0.4, 0.9, z);
    const rail = new T.Mesh(new T.BoxGeometry(1.64, 0.012, 0.03), this.mat(0xB8893A)); rail.position.set(0.04, 0.92, z); g.add(rail);
    for (let i = 1; i <= 4; i++) { const x = x0 + i * S1.startM; const t = new T.Mesh(new T.BoxGeometry(0.006, 0.05, 0.034), this.mat(0xF3E9D2)); t.position.set(x, 0.935, z); g.add(t); const l = this.label(String(i), { size: 0.05, plate: false }); l.position.set(x, 0.885, z + 0.13); g.add(l); }
    const unit = this.label("starting distance", { size: 0.024, plate: false, color: "#C3C9E6", bold: 500 }); unit.position.set(x0 + S1.startM, 0.845, z + 0.13); g.add(unit);
    const earth = this.body("earth", 0.06); earth.position.set(x0, y, z); g.add(earth);
    const moon = this.body("moon", 0.03); moon.position.set(x0 + S1.startM, y, z); g.add(moon);
    const pegE = new T.Mesh(new T.CylinderGeometry(0.004, 0.004, y - 0.92), this.mat(0xB8893A)); pegE.position.set(x0, (y + 0.92) / 2 - 0.03, z); g.add(pegE);
    const pegM = pegE.clone(); g.add(pegM);
    const aE = this.arrow(), aM = this.arrow(), gE = this.arrow(ARROW.ghost, true), gM = this.arrow(ARROW.ghost, true);
    aM.rotation.y = Math.PI; gM.rotation.y = Math.PI; g.add(aE, aM, gE, gM);
    const lE = this.label("Pull on Earth", { size: 0.028 }), lM = this.label("Pull on the Moon", { size: 0.028 }); g.add(lE, lM);
    const lPull = this.label("Pull: the same as the start", { size: 0.036, color: "#FFE3A6" }); lPull.position.set(0.1, 1.28, z - 0.05); g.add(lPull);
    // Pin it graph
    const gc = document.createElement("canvas"); gc.width = 640; gc.height = 440; const gtex = new T.CanvasTexture(gc); gtex.colorSpace = T.SRGBColorSpace;
    const graph = new T.Mesh(new T.PlaneGeometry(0.46, 0.316), new T.MeshBasicMaterial({ map: gtex, transparent: true, toneMapped: false })); graph.position.set(0.54, 1.06, z - 0.1); graph.rotation.y = -0.22; g.add(graph);
    this.s1 = { earth, moon, aE, aM, gE, gM, lE, lM, lPull, pegM, gc, gtex, graph, x0, y, z, pinsKey: "" };
  }
  drawPins(pins) {
    const c = this.s1.gc, g = c.getContext("2d"); const W = c.width, H = c.height;
    g.clearRect(0, 0, W, H); g.fillStyle = "#F3E9D2"; g.beginPath(); g.roundRect ? g.roundRect(0, 0, W, H, 26) : g.rect(0, 0, W, H); g.fill();
    g.fillStyle = "#2A2420"; g.font = FONT(30, 650); g.fillText("Pin it", 24, 44);
    const L = 70, B = H - 70, R = W - 30, Tp = 70; g.strokeStyle = "#6B6158"; g.lineWidth = 3; g.beginPath(); g.moveTo(L, Tp); g.lineTo(L, B); g.lineTo(R, B); g.stroke();
    g.fillStyle = "#2A2420"; g.font = FONT(22, 500);
    for (let i = 0; i <= 4; i++) { const x = L + (R - L) * i / 4; g.fillText(String(i), x - 6, B + 28); const yy = B - (B - Tp) * i / 4; g.fillText(String(i), L - 28, yy + 8); }
    g.fillText("distance (times the start)", L + 120, H - 12); g.save(); g.translate(26, B - 60); g.rotate(-Math.PI / 2); g.fillText("pull", 0, 0); g.restore();
    pins.forEach((p, i) => { const x = L + (R - L) * p.dist / 4, yy = B - (B - Tp) * Math.min(4, p.pull) / 4; g.fillStyle = "#E8A85A"; g.beginPath(); g.arc(x, yy, 13, 0, 7); g.fill(); g.fillStyle = "#2A2420"; g.font = FONT(16, 700); g.textAlign = "center"; g.fillText(String(i + 1), x, yy + 6); g.textAlign = "left"; });
    this.s1.gtex.needsUpdate = true;
  }
  updatePull(m, lab) {
    const s = this.s1; const mx = s.x0 + lab.url.dist * S1.startM; s.moon.position.x = mx; s.pegM.position.x = mx;
    const yE = s.y + 0.1, yM = s.y + 0.17;
    s.aE.position.set(s.x0 + 0.06, yE, s.z); s.gE.position.copy(s.aE.position); s.aE.userData.setLength(m.arrowM, m.keepsGoing); s.gE.userData.setLength(m.ghostM);
    s.aM.position.set(mx - 0.03, yM, s.z); s.gM.position.copy(s.aM.position); s.aM.userData.setLength(m.arrowM, m.keepsGoing); s.gM.userData.setLength(m.ghostM);
    s.lE.position.set(s.x0 + 0.08, yE + 0.08, s.z + 0.01); s.lM.position.set(mx + 0.04, yM + 0.04, s.z + 0.01);
    s.lPull.userData.set(m.lines[0]); s.lE.userData.set(pretty(m.labels.earth)); s.lM.userData.set(pretty(m.labels.moon));
    const key = JSON.stringify(lab.pins); if (key !== s.pinsKey) { s.pinsKey = key; this.drawPins(lab.pins); }
  }
  // ---------------- S2 Mass Dial ----------------
  buildMass() {
    const T = this.T, g = this.groups.mass; const z = -1.2, y = 1.05;
    this.bench(g, 1.4, 0.4, 0.9, z);
    const A = this.body("A", 0.07), B = this.body("B", 0.07); A.position.set(-0.36, y, z); B.position.set(0.36, y, z); g.add(A, B);
    const aA = this.arrow(), aB = this.arrow(); aB.rotation.y = Math.PI; g.add(aA, aB);
    const lA = this.label("A", { size: 0.04 }), lB = this.label("B", { size: 0.04 }); g.add(lA, lB);
    const same = this.label("Same size on both", { size: 0.032, color: "#FFE3A6" }); same.position.set(0, 1.3, z); g.add(same);
    // power-of-ten meter
    const mc = document.createElement("canvas"); mc.width = 1200; mc.height = 220; const mtex = new T.CanvasTexture(mc); mtex.colorSpace = T.SRGBColorSpace;
    const meter = new T.Mesh(new T.PlaneGeometry(1.0, 0.183), new T.MeshBasicMaterial({ map: mtex, transparent: true, toneMapped: false })); meter.position.set(0, 1.5, z - 0.12); g.add(meter);
    this.s2 = { A, B, aA, aB, lA, lB, same, mc, mtex, meter, y, z, key: "" };
  }
  drawMeter(pos) {
    const c = this.s2.mc, g = c.getContext("2d"); const W = c.width, H = c.height;
    g.clearRect(0, 0, W, H); g.fillStyle = "#F3E9D2"; g.beginPath(); g.roundRect ? g.roundRect(0, 0, W, H, 26) : g.rect(0, 0, W, H); g.fill();
    g.fillStyle = "#2A2420"; g.font = FONT(30, 650); g.fillText("This meter counts in powers of ten. Each step is 10 times as strong.", 28, 44);
    const L = 60, R = W - 60, Y = 130; g.strokeStyle = "#6B6158"; g.lineWidth = 4; g.beginPath(); g.moveTo(L, Y); g.lineTo(R, Y); g.stroke();
    const n = S2.meterMax - S2.meterMin;
    for (let i = 0; i <= n; i++) { const x = L + (R - L) * i / n; const big = (S2.meterMin + i) % 10 === 0; g.lineWidth = big ? 4 : 2; g.beginPath(); g.moveTo(x, Y - (big ? 18 : 8)); g.lineTo(x, Y + (big ? 18 : 8)); g.stroke(); if (big) { g.fillStyle = "#2A2420"; g.font = FONT(24, 600); g.textAlign = "center"; g.fillText(i === 0 ? "step 0" : String(i), x, Y + 52); g.textAlign = "left"; } }
    const x = L + (R - L) * pos; g.fillStyle = "#E8A85A"; g.beginPath(); g.moveTo(x, Y - 6); g.lineTo(x - 16, Y - 40); g.lineTo(x + 16, Y - 40); g.closePath(); g.fill();
    this.s2.mtex.needsUpdate = true;
  }
  updateMass(m, lab) {
    const s = this.s2; const T = this.T;
    let rA = 0.07, rB = 0.07;
    if (m.mode === "A") { rA = 0.07 * m.sizes.a; rB = 0.07 * m.sizes.b; this.setKind(s.A, "A"); this.setKind(s.B, "B"); s.lA.userData.set(`A ${lab.mA === 1 ? "" : (lab.mA >= 1 ? "x" + lab.mA : "x1/" + 1 / lab.mA)}`.trim()); s.lB.userData.set(`B ${lab.mB === 1 ? "" : (lab.mB >= 1 ? "x" + lab.mB : "x1/" + 1 / lab.mB)}`.trim()); }
    else { const sz = { ball: 0.03, earth: 0.06, wd: 0.05, sun: 0.11 }; rA = sz[m.chips.a]; rB = sz[m.chips.b]; this.setKind(s.A, m.chips.a); this.setKind(s.B, m.chips.b); s.lA.userData.set(`A: ${lab.url.a === "wd" ? "White dwarf" : lab.url.a === "ball" ? "Bowling ball" : lab.url.a[0].toUpperCase() + lab.url.a.slice(1)}`); s.lB.userData.set(`B: ${lab.url.b === "wd" ? "White dwarf" : lab.url.b === "ball" ? "Bowling ball" : lab.url.b[0].toUpperCase() + lab.url.b.slice(1)}`); }
    s.A.scale.setScalar(rA / 0.07); s.B.scale.setScalar(rB / 0.07);
    s.aA.position.set(-0.36 + rA, s.y, s.z + 0.0); s.aB.position.set(0.36 - rB, s.y, s.z);
    s.aA.userData.setLength(m.arrows.a, !!m.keepsGoing); s.aB.userData.setLength(m.arrows.b, !!m.keepsGoing);
    if (m.mode === "A" && m.arrows.a > 0.36 - rA - 0.02) { s.aA.position.y = s.y + 0.03; s.aB.position.y = s.y - 0.03; } else { s.aA.position.y = s.y + (m.mode === "B" ? 0.03 : 0); s.aB.position.y = s.y - (m.mode === "B" ? 0.03 : 0); }
    s.lA.position.set(-0.36, s.y - rA - 0.05, s.z + 0.02); s.lB.position.set(0.36, s.y - rB - 0.05, s.z + 0.02);
    s.meter.visible = m.mode === "B"; if (m.mode === "B") { const k = String(m.meter); if (k !== s.key) { s.key = k; this.drawMeter(m.meter); } }
  }
  setKind(mesh, kind) { if (mesh.userData.kind === kind) return; mesh.userData.kind = kind; mesh.material.map = this.sphereTex(kind); mesh.material.needsUpdate = true; }
  // ---------------- S3 Weigh Yourself Anywhere ----------------
  buildWeigh() {
    const T = this.T, g = this.groups.weigh; const z = -1.6; this.s3 = { plats: {}, z };
    const deck = { earth: 0x5C8E5A, moon: 0xA6A6AE, mars: 0xB5674A, jupiter: 0xD8B48A, ns: 0xC6D6F2 };
    SCENE_WORLDS.forEach((w, i) => {
      const x = S3_X(i); const p = new T.Group(); p.position.set(x, 0, z); g.add(p);
      const plat = stepPlatform(T); p.add(plat); plat.userData.noOutline = false;
      const tint = new T.Mesh(new T.CircleGeometry(PROP_SIZE.platform.r * 0.92, 48), this.mat(deck[w])); tint.rotation.x = -Math.PI / 2; tint.position.y = PROP_SIZE.platform.h + 0.0008; p.add(tint);
      if (w === "jupiter") { const cl = this.body("jupiter", 0.24); cl.scale.y = 0.18; cl.position.y = -0.02; p.add(cl); }
      let nsL = null;
      if (w === "ns") { const ns = new T.Mesh(new T.SphereGeometry(0.05, 24, 16), new T.MeshBasicMaterial({ color: 0xCFE3FF })); ns.position.set(0, 0.0, 0.32); p.add(ns); const halo = new T.Mesh(new T.SphereGeometry(0.075, 24, 16), new T.MeshBasicMaterial({ color: 0x9CC2FF, transparent: true, opacity: 0.25, depthWrite: false })); halo.position.copy(ns.position); p.add(halo); nsL = this.label("about 24 km across,\nthe size of a city"); nsL.position.set(0, 0.14, 0.28); p.add(nsL); }
      const sc = springScale(T); sc.position.y = PROP_SIZE.platform.h; p.add(sc);
      const sign = this.label(WORLD_NAME[w] === "Jupiter" ? "Jupiter\n(near the cloud tops)" : WORLD_NAME[w]); sign.position.set(0, 1.78, 0); p.add(sign);
      this.s3.plats[w] = { p, sc, x, plat, sign, nsL };
    });
    // Dimitry t435: the student is the traveler on Earth, Moon, Mars and Jupiter; the robot is only at the neutron star
    this.s3.traveler = traveler(T); g.add(this.s3.traveler);
    this.s3.robot = robot(T); this.s3.robot.visible = false; g.add(this.s3.robot);
    // balance on a stand 0.28 m farther from the platform so the figure's hand does not overlap the plinth (Angelo)
    const stand = new T.Group(); const col = new T.Mesh(new T.CylinderGeometry(0.03, 0.05, 0.78, 16), this.mat(0x5A6498)); col.position.y = 0.39; stand.add(col);
    const top = new T.Mesh(new T.CylinderGeometry(0.16, 0.16, 0.02, 32), this.mat(0xD9B98A)); top.position.y = 0.79; top.userData.noOutline = true; stand.add(top);
    const bal = balance(T); bal.position.y = 0.8; stand.add(bal); g.add(stand); this.s3.stand = stand; this.s3.bal = bal;
    const balL = this.label("Balance: 50 kg"); balL.position.set(0.02, 1.36, 0.08); stand.add(balL);
    const bar = this.label("", { size: 0.034, color: "#FFE3A6" }); g.add(bar); this.s3.bar = bar;
  }
  /** Swap in Angelo's GLBs (gf-props MODEL_BASE). The code-built props stay until each file loads, and stay for good if
   * it fails. Angelo's unlit albedo is kept as is (no tone mapping). Ink outlines are thinner, skipped on contact_shadow,
   * pointer_shadow, the balance plinth (body) and tiny parts. */
  async swapGLB() {
    const T = this.T; const S = this.s3; this.glb = { loaded: [], failed: [] };
    const outline = (root) => { const ol = outlineMaterial(T, this.U); const list = []; root.traverse((o) => { if (o.isMesh && o.name !== "readout" && o.name !== "lens" && o.name !== "needle" && !skipOutline(o, root)) list.push(o); });
      for (const o of list) { if (!o.geometry.boundingSphere) o.geometry.computeBoundingSphere(); const r = o.geometry.boundingSphere.radius * Math.max(o.scale.x, o.scale.y, o.scale.z); if (r < 0.01) continue; const sh = new T.Mesh(this.weld(o.geometry), ol); sh.userData.gfOutline = true; sh.userData.noPaint = true; o.add(sh); } };
    const done = (name, ok) => { (ok ? this.glb.loaded : this.glb.failed).push(name); };
    const [plat, sc, bal, rb] = await Promise.all(["step_platform", "spring_scale", "balance", "robot"].map((n) => loadModel(T, n)));
    for (const w of SCENE_WORLDS) {
      const P = S.plats[w];
      if (plat) { const c = cloneModel(plat); outline(c); P.plat.visible = false; P.p.add(c); }
      if (sc) { const c = rigSpringScaleGLB(T, cloneModel(sc)); if (c) { c.position.copy(P.sc.position); outline(c); P.sc.visible = false; P.p.add(c); P.sc = c; } }
    }
    done("step_platform", !!plat); done("spring_scale", !!sc);
    if (bal) { const c = rigBalanceGLB(T, cloneModel(bal)); if (c) { c.position.copy(S.bal.position); outline(c); S.bal.visible = false; S.stand.add(c); S.bal = c; } }
    done("balance", !!bal);
    if (rb) { const c = cloneModel(rb); outline(c); c.name = "robot_glb"; this.groups.weigh.add(c); S.robot.visible = false; S.robotCode = S.robot; S.robot = c; }
    done("robot", !!rb);
    if (typeof window !== "undefined") window.dispatchEvent(new CustomEvent("gf-models", { detail: this.glb }));
  }
  weld(geo) { const T = this.T; this._weld = this._weld || new WeakMap(); let g = this._weld.get(geo); if (g) return g;
    g = new T.BufferGeometry(); const p = geo.attributes.position; const arr = new Float32Array(p.count * 3); for (let i = 0; i < p.count; i++) { arr[3 * i] = p.getX(i); arr[3 * i + 1] = p.getY(i); arr[3 * i + 2] = p.getZ(i); }
    g.setAttribute("position", new T.BufferAttribute(arr, 3)); if (geo.index) g.setIndex(Array.from(geo.index.array)); g.computeVertexNormals();
    const n = g.attributes.normal; const key = (i) => `${Math.round(p.getX(i) * 2e3)},${Math.round(p.getY(i) * 2e3)},${Math.round(p.getZ(i) * 2e3)}`; const acc = new Map();
    for (let i = 0; i < p.count; i++) { const k = key(i); const a = acc.get(k) || [0, 0, 0]; a[0] += n.getX(i); a[1] += n.getY(i); a[2] += n.getZ(i); acc.set(k, a); }
    for (let i = 0; i < p.count; i++) { const a = acc.get(key(i)); const l = Math.hypot(a[0], a[1], a[2]) || 1; n.setXYZ(i, a[0] / l, a[1] / l, a[2] / l); }
    this._weld.set(geo, g); return g; }
  updateWeigh(m, lab) {
    const s = this.s3; for (const w of SCENE_WORLDS) { const P = s.plats[w]; const n = GF.travelerKg * GF.G * GF.worlds[w].massKg / GF.worlds[w].radiusM ** 2; P.sc.userData.setReading(needleAngleDeg(n), w === lab.url.world ? m.spring.main : "", w === lab.url.world ? m.spring.sub : ""); P.p.scale.setScalar(w === lab.url.world ? 1 : 0.92); }
    const P = s.plats[lab.url.world];
    for (const w of SCENE_WORLDS) { const Q = s.plats[w]; Q.sign.visible = w === lab.url.world; if (Q.nsL) Q.nsL.visible = lab.url.world === "ns"; }
    const useRobot = lab.url.world === "ns"; s.robot.visible = useRobot; s.traveler.visible = !useRobot;
    const fig = useRobot ? s.robot : s.traveler; const sk = P.p.scale.x;   // stand on the scale at (0, 0.0485, -0.086) (Angelo)
    fig.position.set(P.x + ROBOT.onScale[0] * sk, (PROP_SIZE.platform.h + ROBOT.onScale[1]) * sk, s.z + ROBOT.onScale[2] * sk); fig.rotation.y = 0; fig.scale.setScalar(sk);
    s.stand.position.set(P.x + 0.64, 0, s.z + 0.38); s.stand.rotation.y = -0.28;
    s.bar.userData.set(`${m.name}: ${m.lines[0].split(":")[0] === m.name ? m.lines[0].slice(m.name.length + 2) : m.spring.main}`); s.bar.position.set(P.x, 1.66, s.z);
    s.bar.visible = false;
  }
  // ---------------- S4 Astronauts Still Have Gravity ----------------
  buildIss() {
    const T = this.T, g0 = this.groups.iss; const g = new T.Group(); g0.add(g); const x = 0.3, z = -1.4; const R = GF.worlds.earth.radiusM / 1000 / S4.rulerKm * S4.rulerM;   // Earth to the ruler's scale
    const earth = new T.Mesh(new T.SphereGeometry(R, 128, 64), new T.MeshLambertMaterial({ map: this.sphereTex("earth") })); earth.position.set(x, -R, z); earth.rotation.z = 0.4; g.add(earth);
    const atmo = new T.Mesh(new T.SphereGeometry(R * 1.0016, 128, 64), new T.MeshBasicMaterial({ color: 0x8FC1FF, transparent: true, opacity: 0.18, depthWrite: false })); atmo.position.copy(earth.position); g.add(atmo);
    const ruler = new T.Mesh(new T.BoxGeometry(0.03, S4.rulerM, 0.012), this.mat(0xF3E9D2)); ruler.position.set(x + 0.2, S4.rulerM / 2, z); g.add(ruler);
    for (let k = 0; k <= 4; k++) { const yy = k === 1 ? 0.5 : k * 0.5; const t = new T.Mesh(new T.BoxGeometry(k % 2 ? 0.07 : 0.11, 0.008, 0.016), this.mat(0x2A2420)); t.position.set(x + 0.2, yy, z + 0.002); g.add(t); if (k === 0 || k === 1 || k === 4) { const l = this.label(k === 0 ? "Ground" : k === 1 ? "100 km" : "400 km"); l.position.set(x + 0.36, yy + 0.02, z); g.add(l); } }
    // the 35,786 km stop is far off this ruler: a dashed cap at the top with its own cream tick label
    const capL = this.label("35,786 km:\nabout 179 m up this ruler"); capL.position.set(x - 0.08, 2.22, z); g.add(capL);
    const capLine = new FatLine(T, this.U, { color: 0xF3E9D2, width: 2, dashed: true, max: 4 }); capLine.setPoints([new T.Vector3(x + 0.2, 2.0, z), new T.Vector3(x + 0.2, 2.36, z)]); g.add(capLine.mesh);
    // the station at the 400 km mark, drawn far bigger than scale so it reads (Leo: about 15 to 20% of the frame)
    const issR = station(T, 0.8); issR.position.set(x + 0.52, 1.95, z - 0.08); issR.rotation.set(1.05, -0.2, 0.08); g.add(issR);
    const issRL = this.label("Space station, 400 km\n(drawn much bigger than scale)"); issRL.position.set(x + 0.52, 1.55, z - 0.08); g.add(issRL);
    const note = this.label("Ruler to scale:\n0.5 m stands for 100 km"); note.position.set(x - 0.12, 0.72, z); g.add(note);
    const cable = new T.Mesh(new T.CylinderGeometry(0.002, 0.002, 1, 6), this.mat(0xC3C9E6)); g.add(cable);
    const cab = new T.Group(); const glass = new T.Mesh(new T.BoxGeometry(0.2, 0.26, 0.2), new T.MeshBasicMaterial({ color: 0xAACDFF, transparent: true, opacity: 0.18, depthWrite: false })); cab.add(glass);
    const edges = new T.LineSegments(new T.EdgesGeometry(new T.BoxGeometry(0.2, 0.26, 0.2)), new T.LineBasicMaterial({ color: 0xE6E9F8, transparent: true, opacity: 0.7 })); cab.add(edges);
    const fig = traveler(T, 0.16); fig.position.set(-0.03, -0.12, 0); cab.add(fig);
    const ball = new T.Mesh(new T.SphereGeometry(0.014, 14, 10), this.mat(0xE2B27C)); ball.position.set(0.05, 0, 0.03); cab.add(ball);
    const mini = springScale(T); mini.scale.setScalar(0.35); mini.position.set(-0.03, -0.13, 0); cab.add(mini); fig.position.y = -0.12 + 0.019;
    g.add(cab);
    const ghost = this.arrow(ARROW.ghost, true), pullA = this.arrow(); ghost.rotation.z = -Math.PI / 2; pullA.rotation.z = -Math.PI / 2; g.add(ghost, pullA);
    const ghostL = this.label("Pull on the ground", { size: 0.05 }); g.add(ghostL); const pullL = this.label("Pull here", { size: 0.05 }); g.add(pullL);
    const cutL = this.label("", { size: 0.05, color: "#FFE3A6" }); g.add(cutL); const scaleL = this.label("", { size: 0.05, color: "#FFE3A6" }); g.add(scaleL);
    const over = this.label("", { size: 0.045, color: "#C3C9E6" }); g.add(over);
    // outside view: the station falling around Earth (help card, same picture as the circular shot)
    const out = new T.Group(); out.position.set(0, 1.25, -1.5); g0.add(out);
    const mE = new T.Mesh(new T.SphereGeometry(0.3, 48, 32), new T.MeshLambertMaterial({ map: this.sphereTex("earth") })); out.add(mE);
    const orbitR = 0.3 * (GF.worlds.earth.radiusM + 400e3) / GF.worlds.earth.radiusM;
    const st = station(T, 0.17); out.add(st);
    const orbit = new FatLine(T, this.U, { color: 0xF3E9D2, width: 2.5, dashed: true, opacity: 0.85, max: 200 }); orbit.setPoints(Array.from({ length: 181 }, (_, i) => new T.Vector3(Math.cos(i / 180 * Math.PI * 2) * orbitR, 0, Math.sin(i / 180 * Math.PI * 2) * orbitR))); out.add(orbit.mesh);
    const trailF = new FatLine(T, this.U, { color: 0xE8A85A, width: 4, max: 64 }); out.add(trailF.mesh); const trail = { trailF };
    const stL = this.label("Space station\n(drawn much bigger than scale)"); st.add(stL); stL.position.set(0, 0.1, 0);
    const orbL = this.label("Its path: about 400 km up,\none lap in about 92 minutes"); orbL.position.set(0, -0.42, 0); out.add(orbL);
    const outL = this.label("Outside view: the station falls around Earth", { size: 0.03 }); outL.position.set(0, 0.42, 0); out.add(outL);
    this.s4 = { ruler: g, x, z, earth, cab, cable, ghost, pullA, ghostL, pullL, cutL, scaleL, over, fig, ball, mini, out, st, trail, orbitR, fall: 0, step: "ride", y: 0 };
  }
  updateIss(m, lab, dt) {
    const s = this.s4; const st = lab.issStep; const T = this.T;
    if (st !== s.step) { s.step = st; s.fall = 0; }
    let yCab = s4Height(lab.url.alt);
    if (st === "cut") { s.fall = Math.min(4, s.fall + dt * (this.calm ? 4 : 1)); yCab = s4Height(400) - 0.012 * s.fall * s.fall; }
    s.y += (yCab - s.y) * Math.min(1, dt * (this.calm ? 50 : 2.2)); if (st === "cut") s.y = yCab;
    const cx = s.x + 0.05; s.cab.position.set(cx, s.y + 0.13, s.z); s.cab.visible = st !== "station";
    s.cable.visible = st === "ride"; s.cable.scale.y = Math.max(0.001, s.y); s.cable.position.set(cx, s.y / 2, s.z);
    const float = st !== "ride"; const bob = Math.sin(this.t * 1.3) * 0.006;
    s.fig.position.y = -0.12 + 0.019 + (float ? 0.03 + bob : 0); s.ball.position.y = float ? 0.02 - bob : -0.115;
    s.mini.userData.setReading(needleAngleDeg(float ? 0 : GF.travelerKg * 9.82 * m.ratio), "", "");
    const L = 0.3; s.ghost.position.set(s.x - 0.12, 0.34, s.z); s.ghost.userData.setLength(L); s.ghostL.position.set(s.x - 0.42, 0.2, s.z);
    s.pullA.position.set(cx - 0.16, s.y + 0.26, s.z); s.pullA.userData.setLength(L * m.arrow); s.pullL.position.set(cx - 0.42, s.y + 0.2, s.z);
    s.ghost.visible = s.ghostL.visible = st !== "station" && lab.url.alt !== 0; s.pullA.visible = s.pullL.visible = st !== "station";
    s.cutL.visible = s.scaleL.visible = st === "cut";
    if (m.cutLabels) { s.cutL.userData.set(m.cutLabels.pull); s.scaleL.userData.set(m.cutLabels.scale); s.cutL.position.set(cx - 0.5, s.y + 0.4, s.z); s.scaleL.position.set(cx + 0.5, s.y + 0.4, s.z); }
    s.over.visible = m.overScale && st === "ride"; if (m.overScale) { s.over.userData.set(lab.url.alt === 384400 ? "Not to scale: the Moon's distance\nwould be far above this ruler" : "Not to scale: this stop would be\nabout 179 m up the ruler"); s.over.position.set(cx - 0.05, 2.32, s.z); }
    s.out.visible = st === "station"; s.ruler.visible = st !== "station";
    if (st === "station") { const w = (this.calm ? 0 : 1) * this.t * 2 * Math.PI / 5; const a = w; s.st.position.set(Math.cos(a) * s.orbitR, 0, Math.sin(a) * s.orbitR); s.st.rotation.y = -a; const pts = []; for (let i = 0; i < 48; i++) { const b = a - i * 0.03; pts.push(new T.Vector3(Math.cos(b) * s.orbitR, 0, Math.sin(b) * s.orbitR)); } s.trail.trailF.setPoints(pts); s.out.rotation.x = 0.35; }
  }
  // ---------------- S5 The Gravity-Well Sheet ----------------
  buildWell() {
    const T = this.T, g = this.groups.well; const z = -1.15, y = 1.0;
    const sheet = new T.Group(); sheet.position.set(0, y, z); sheet.rotation.x = 0.2; g.add(sheet);
    const rim = new T.Mesh(new T.TorusGeometry(SHEET.radiusM, 0.012, 8, 96), this.mat(0xB8893A)); rim.rotation.x = Math.PI / 2; sheet.add(rim);
    for (let i = 0; i < 3; i++) { const a = i * 2.094 + 0.5; const leg = new T.Mesh(new T.CylinderGeometry(0.015, 0.02, y + 0.1), this.mat(0x3E4A7A)); leg.position.set(Math.cos(a) * SHEET.radiusM, -(y + 0.1) / 2, Math.sin(a) * SHEET.radiusM); leg.rotation.x = -0.2; sheet.add(leg); }
    const grid = new T.LineSegments(new T.BufferGeometry(), new T.LineBasicMaterial({ color: 0x9FC3FF, transparent: true, opacity: 0.75 })); sheet.add(grid);
    const fill = new T.Mesh(new T.BufferGeometry(), new T.MeshBasicMaterial({ color: 0x1A2A66, transparent: true, opacity: 0.5, side: T.DoubleSide, depthWrite: false, vertexColors: true })); sheet.add(fill);
    const center = new T.Group(); sheet.add(center);
    const objs = { earth: this.body("earth", 0.035), wd: this.body("wd", 0.022), sun: this.body("sun", SHEET.sunSurface * SHEET.radiusM), bh: new T.Mesh(new T.SphereGeometry(0.022, 24, 16), new T.MeshBasicMaterial({ color: 0x000000 })) };
    const ring = new T.Mesh(new T.TorusGeometry(0.03, 0.0025, 8, 64), new T.MeshBasicMaterial({ color: 0xFFE3A6 })); ring.rotation.x = Math.PI / 2; objs.bh.add(ring);
    const twin = new T.Mesh(new T.SphereGeometry(0.008, 16, 10), new T.MeshBasicMaterial({ color: 0x000000 })); const tring = new T.Mesh(new T.TorusGeometry(0.014, 0.0018, 8, 48), new T.MeshBasicMaterial({ color: 0xFFE3A6 })); tring.rotation.x = Math.PI / 2; twin.add(tring); objs.twin = twin;
    for (const o of Object.values(objs)) { o.visible = false; center.add(o); }
    const lab = this.label("", { size: 0.032 }); g.add(lab);
    const start = new T.Mesh(new T.SphereGeometry(0.014, 14, 10), new T.MeshBasicMaterial({ color: 0xE6E9F8, transparent: true, opacity: 0.5 })); sheet.add(start);
    const startL = this.label("Start", { size: 0.026 }); g.add(startL);
    this.s5 = { sheet, grid, fill, objs, lab, start, startL, key: "", marbles: [], y, z, D: 0.2, center };
  }
  // ---------------- S5c Real or model? (two painted bins on a bench; cards drop into the bin you pick) ----------------
  buildSort() {
    const T = this.T, g = this.groups.sort; const z = -0.85, y = 0.86;
    this.bench(g, 1.3, 0.5, y, z);
    const bins = {};
    for (const [k, x, title] of [["real", -0.33, "Real"], ["model", 0.33, "Model"]]) {
      const tray = new T.Group(); tray.position.set(x, y, z + 0.02); g.add(tray);
      const base = new T.Mesh(new T.BoxGeometry(0.5, 0.02, 0.32), this.mat(0x3A4A80)); base.position.y = 0.01; tray.add(base);
      for (const [w, d, px, pz] of [[0.5, 0.02, 0, -0.15], [0.5, 0.02, 0, 0.15], [0.02, 0.32, -0.24, 0], [0.02, 0.32, 0.24, 0]]) { const wall = new T.Mesh(new T.BoxGeometry(w, 0.07, d), this.mat(0x4A5A90)); wall.position.set(px, 0.045, pz); tray.add(wall); }
      const lip = new T.Mesh(new T.BoxGeometry(0.5, 0.006, 0.02), this.mat(0xE8C9A0)); lip.position.set(0, 0.082, 0.15); tray.add(lip);
      const l = this.label(title); l.position.set(0, -0.06, 0.2); tray.add(l);
      bins[k] = tray;
    }
    const cards = {};
    {
      SORT_CARDS.forEach((c, i) => {
        const cv = document.createElement("canvas"); cv.width = 512; cv.height = 192; const cg = cv.getContext("2d");
        cg.fillStyle = CREAM; cg.beginPath(); cg.roundRect ? cg.roundRect(2, 2, 508, 188, 24) : cg.rect(2, 2, 508, 188); cg.fill(); cg.strokeStyle = "rgba(42,36,32,0.45)"; cg.lineWidth = 4; cg.stroke();
        cg.fillStyle = INK; cg.font = FONT(38, 600); cg.textBaseline = "top";
        const words = c.text.split(" "); let line = "", yy = 22; for (const wd of words) { const t = line ? line + " " + wd : wd; if (cg.measureText(t).width > 460) { cg.fillText(line, 26, yy); yy += 48; line = wd; } else line = t; } cg.fillText(line, 26, yy);
        const tex = new T.CanvasTexture(cv); tex.colorSpace = T.SRGBColorSpace; tex.anisotropy = 4;
        const cardW = 0.2, cardH = 0.155, gap = 0.024, n = SORT_CARDS.length;
        const card = new T.Mesh(new T.PlaneGeometry(cardW, cardH), new T.MeshBasicMaterial({ map: tex, toneMapped: false, side: T.DoubleSide }));
        card.userData.noPaint = true;
        const mid = (n - 1) / 2, t = mid === 0 ? 0 : (i - mid) / mid;
        const span = n * cardW + (n - 1) * gap; const x0 = -span / 2 + cardW / 2;
        const home = new T.Vector3(x0 + i * (cardW + gap), 1.34, z - 0.06 + 0.035 * t * t);
        card.position.copy(home); card.rotation.set(-0.18, t * 0.1, 0); card.userData.home = home; card.userData.homeRot = [-0.18, t * 0.1, 0];
        g.add(card); cards[c.id] = card;
      });
    }
    this.sortV = { bins, cards, z, y };
  }
  updateSort(m, lab, dt) {
    const S = this.sortV; const T = this.T; const count = { real: 0, model: 0 };
    const floating = Object.entries(S.cards).filter(([id]) => !lab.sortPicks[id]);
    const nF = floating.length, cardW = 0.2, gap = 0.024;
    const span = nF * cardW + Math.max(0, nF - 1) * gap, x0 = -span / 2 + cardW / 2;
    let fi = 0;
    for (const [id, card] of Object.entries(S.cards)) {
      const bin = lab.sortPicks[id]; let tgt, rot;
      if (bin) { const n = count[bin]++; const b = S.bins[bin].position; tgt = new T.Vector3(b.x + ((n % 2) ? 0.08 : -0.08), S.y + 0.16 + n * 0.045, b.z + 0.04 - n * 0.02); rot = [-0.48, 0, 0]; }
      else {
        const mid = (nF - 1) / 2, t = mid === 0 ? 0 : (fi - mid) / mid;
        tgt = new T.Vector3(x0 + fi * (cardW + gap), 1.34, S.z - 0.06 + 0.035 * t * t);
        rot = [-0.18, t * 0.1, 0]; fi++;
      }
      const k = this.calm ? 1 : Math.min(1, dt * 6); card.position.lerp(tgt, k);
      card.rotation.x += (rot[0] - card.rotation.x) * k; card.rotation.y += (rot[1] - card.rotation.y) * k; card.rotation.z += (rot[2] - card.rotation.z) * k;
    }
  }
  sheetY(s, e, x, y) { return this.s5.D * (wellDepth(s, Math.hypot(x, y), e) - wellDepth(s, 1, e)) / 1; }
  rebuildSheet(s, e) {
    const T = this.T; const P = this.s5; const pos = []; const N = 28, steps = 80;
    for (let i = 0; i <= N; i++) { const c = -1 + 2 * i / N; const half = Math.sqrt(Math.max(0, 1 - c * c)); if (half <= 0) continue;
      for (const dir of [0, 1]) { let prev = null; for (let k = 0; k <= steps; k++) { const t = -half + 2 * half * k / steps; const x = dir ? c : t, yy = dir ? t : c; const p = [x * SHEET.radiusM, this.sheetY(s, e, x, yy), yy * SHEET.radiusM]; if (prev) pos.push(...prev, ...p); prev = p; } } }
    P.grid.geometry.dispose(); P.grid.geometry = new T.BufferGeometry(); P.grid.geometry.setAttribute("position", new T.Float32BufferAttribute(pos, 3));
    // depth shading: a polar mesh, darker in the well
    const vs = [], cs = [], idx = []; const NR = 40, NA = 72;
    for (let r = 0; r <= NR; r++) for (let a = 0; a <= NA; a++) { const rr = r / NR, th = a / NA * Math.PI * 2; const x = rr * Math.cos(th), yy = rr * Math.sin(th); const d = this.sheetY(s, e, x, yy); vs.push(x * SHEET.radiusM, d - 0.002, yy * SHEET.radiusM); const k = Math.min(1, -d / 0.25); cs.push(0.10 + 0.05 * (1 - k), 0.16 + 0.05 * (1 - k), 0.40 - 0.18 * k); }
    for (let r = 0; r < NR; r++) for (let a = 0; a < NA; a++) { const i0 = r * (NA + 1) + a, i1 = i0 + NA + 1; idx.push(i0, i1, i0 + 1, i1, i1 + 1, i0 + 1); }
    const fg = new T.BufferGeometry(); fg.setAttribute("position", new T.Float32BufferAttribute(vs, 3)); fg.setAttribute("color", new T.Float32BufferAttribute(cs, 3)); fg.setIndex(idx); P.fill.geometry.dispose(); P.fill.geometry = fg;
  }
  updateWell(m, lab, dt) {
    const P = this.s5; const T = this.T; const u = lab.url; const twin = !!u.twin && u.obj === "sun";
    const s = SHEET.k * GF.sheet[twin ? "sun" : u.obj].strength, e = twin ? SHEET.eTwin : SHEET.e; const key = `${u.obj}${twin}`;
    if (key !== P.key) { P.key = key; this.rebuildSheet(s, e); for (const [k, o] of Object.entries(P.objs)) o.visible = twin ? k === "twin" : k === u.obj; }
    const cy = this.sheetY(s, e, 0, 0); P.center.position.y = cy + (u.obj === "sun" && !twin ? SHEET.sunSurface * SHEET.radiusM * 0.6 : 0.02);
    P.lab.userData.set(m.label ? `${m.name}\n${m.label}` : m.name); P.lab.position.set(0, P.y + 0.2, P.z - 0.06);
    P.start.position.set(SHEET.startX * SHEET.radiusM, this.sheetY(s, e, SHEET.startX, SHEET.startY) + 0.014, SHEET.startY * SHEET.radiusM);
    const sp = P.sheet.localToWorld(P.start.position.clone()); P.startL.position.set(sp.x - 0.05, sp.y + 0.06, sp.z);
    if (!this.paused) stepSheet(lab, Math.min(0.05, dt), stepMarble);
    while (P.marbles.length < lab.marbles.length) {
      const ball = new T.Mesh(new T.SphereGeometry(0.012, 14, 10), this.mat(0xE6E9F8, { emissive: 0x4A5A8A })); const fl = new FatLine(T, this.U, { color: 0xE8A85A, width: 3, max: 620 }); const line = fl.mesh;
      const tag = this.label(""); P.sheet.add(ball, line, tag); P.marbles.push({ ball, line, fl, tag });
    }
    P.marbles.forEach((v, i) => {
      const mb = lab.marbles[i]; v.ball.visible = v.line.visible = !!mb; v.tag.visible = false; if (!mb) return;
      const latest = !mb.ghost && lab.marbles.filter((o) => !o.ghost && o.speed === mb.speed).slice(-1)[0] === mb;
      if (latest) { v.tag.visible = true; v.tag.userData.set(mb.speed); v.tag.position.set(mb.x * SHEET.radiusM, this.sheetY(s, e, mb.x, mb.y) + 0.06, mb.y * SHEET.radiusM); }
      const yy = this.sheetY(s, e, mb.x, mb.y) + 0.012; v.ball.position.set(mb.x * SHEET.radiusM, yy, mb.y * SHEET.radiusM);
      v.ball.material.transparent = mb.ghost; v.ball.material.opacity = mb.ghost ? 0.4 : 1; // the bent marble path is amber, 3 px (Leo); the faint help-level path is cool and thinner
      v.fl.color = mb.ghost ? 0xC3C9E6 : 0xE8A85A; v.fl.opacity = mb.ghost ? 0.55 : 1; v.fl.width = mb.ghost ? 2 : 3;
      const tr = mb.trail.slice(-600); const pts = tr.map(([x, y]) => new T.Vector3(x * SHEET.radiusM, this.sheetY(s, e, x, y) + 0.006, y * SHEET.radiusM));
      v.fl.setPoints(pts);
    });
  }
  // ---------------- frame ----------------
  show(scene, view) {
    for (const [k, g] of Object.entries(this.groups)) g.visible = view === "sort" ? k === "sort" : k === scene;
  }
  /** cam: { pos, quat, fov, hCss, phone, xr }. */
  update(m, lab, dt, cam) {
    this.t += this.paused ? 0 : dt; const sc = lab.url.scene; const view = m.view || null; this.show(sc, view);
    this.calm = !!lab.calm; this.U.uBoil.value = this.calm ? 0 : 1; if (!this.calm && !this.paused) this.U.uBoilT.value += dt;
    if (sc === "pull") this.updatePull(m, lab); else if (sc === "mass") this.updateMass(m, lab); else if (sc === "weigh") this.updateWeigh(m, lab); else if (sc === "iss") this.updateIss(m, lab, this.paused ? 0 : dt); else if (view === "sort") this.updateSort(m, lab, dt); else this.updateWell(m, lab, dt);
    if (cam) this.placeLabels(cam);
  }
  /** Upright, camera-facing, constant on-screen size. Flat: parallel to the screen (no tilt from the off-centre view).
   * Headset: turned toward the eye with world up, so a head roll never tilts the text.
   * Flat screens also declutter overlaps and clamp every pill to a 12 px safe margin inside the visible stage
   * (the left column on desktop, so labels stay clear of the side panel; below the phone header). */
  placeLabels(cam) {
    const T = this.T; const wp = new T.Vector3(), pq = new T.Quaternion(), fwd = new T.Vector3(0, 0, -1).applyQuaternion(cam.quat);
    const k = 2 * Math.tan((cam.fov || 46) * Math.PI / 360) / Math.max(1, cam.hCss || 800); const px = cam.phone ? LABEL.phonePx : LABEL.deskPx;
    const placed = []; const up = new T.Vector3(0, 1, 0).applyQuaternion(cam.quat);
    const right = new T.Vector3(1, 0, 0).applyQuaternion(cam.quat);
    const hCss = cam.hCss || 800, wCss = cam.wCss || (cam.camera && cam.camera.aspect ? cam.camera.aspect * hCss : hCss * 1.6);
    const visW = cam.visibleW || wCss, margin = 12;
    const leftB = -wCss / 2 + margin, rightB = -wCss / 2 + visW - margin;
    const topB = hCss / 2 - (cam.phone ? 70 : margin), botB = -hCss / 2 + margin;
    for (const l of this.labels) {
      if (l.userData.hiddenForOverlap) { l.material.opacity = l.userData.text === "" ? 0 : 1; l.userData.hiddenForOverlap = false; }
      if (l.userData.off) { if (l.userData.lastPos && l.position.equals(l.userData.lastPos)) l.position.sub(l.userData.off); l.userData.off = null; l.userData.lastPos = null; }
      if (!l.parent || l.material.opacity === 0) continue; let vis = true; for (let o = l; o; o = o.parent) if (!o.visible) { vis = false; break; } if (!vis) continue;
      l.getWorldPosition(wp);
      if (cam.xr) l.lookAt(cam.pos); else { l.parent.getWorldQuaternion(pq); l.quaternion.copy(pq.invert().multiply(cam.quat)); }
      const d = Math.max(0.05, cam.xr ? wp.distanceTo(cam.pos) : wp.clone().sub(cam.pos).dot(fwd));
      const font = cam.xr ? d * LABEL.xrPerM : px * d * k;
      const ps = l.parent.getWorldScale(new T.Vector3()).x || 1; const sc = font / LABEL.fontPx / ps;
      l.scale.set(l.userData.w * sc, l.userData.h * sc, 1);
      if (cam.xr) continue;
      const ppx = 1 / (d * k); let cx, cy;
      if (cam.camera) { cam.camera.updateMatrixWorld(); const pr = wp.clone().project(cam.camera); cx = pr.x * wCss / 2; cy = pr.y * hCss / 2; }
      else { const sx = wp.clone().sub(cam.pos); cx = sx.dot(right) * ppx; cy = sx.dot(up) * ppx; }
      const hw = l.userData.w * font / LABEL.fontPx * ppx / 2 + 3, hh = l.userData.h * font / LABEL.fontPx * ppx / 2 + 2;
      const solve = (dir) => { let lift = 0; for (let pass = 0; pass < 8; pass++) { const hit = placed.find((r) => Math.abs(r.x - cx) < r.hw + hw && Math.abs(r.y - (cy + lift)) < r.hh + hh); if (!hit) return lift; lift = dir > 0 ? hit.y + hit.hh + hh - cy : hit.y - hit.hh - hh - cy; } return lift; };
      const upL = solve(1), dnL = solve(-1);
      let dy = cy + upL + hh > topB ? dnL : Math.abs(dnL) < Math.abs(upL) ? dnL : upL;
      let dx = 0;
      if (cx + hw > rightB) dx = rightB - hw - cx;
      if (cx + dx - hw < leftB) dx = leftB + hw - cx;
      if (cy + dy + hh > topB) dy = topB - hh - cy;
      if (cy + dy - hh < botB) dy = botB + hh - cy;
      const px_ = cx + dx, py = cy + dy;
      const overflow = px_ - hw < leftB - 1 || px_ + hw > rightB + 1 || py - hh < botB - 1 || py + hh > topB + 1;
      const hit = placed.some((r) => Math.abs(r.x - px_) < r.hw + hw && Math.abs(r.y - py) < r.hh + hh);
      if (overflow || hit) { l.material.opacity = 0; l.userData.hiddenForOverlap = true; continue; }
      placed.push({ x: px_, y: py, hw, hh });
      if (dx !== 0 || dy !== 0) {
        const pl = l.parent.getWorldScale(new T.Vector3()).x || 1;
        const off = up.clone().multiplyScalar(dy / ppx / pl).add(right.clone().multiplyScalar(dx / ppx / pl));
        const inv = l.parent.getWorldQuaternion(new T.Quaternion()).invert(); off.applyQuaternion(inv);
        l.position.add(off); l.userData.off = off; l.userData.lastPos = l.position.clone();
      }
    }
  }
  /** Pickable things for a ray or a tap: the S1 Moon and the S5 start ball. */
  pickables(scene) { return scene === "pull" ? [this.s1.moon] : scene === "well" ? [this.s5.start] : []; }
}
function mulberry(a) { return () => { a |= 0; a = (a + 0x6D2B79F5) | 0; let t = Math.imul(a ^ (a >>> 15), 1 | a); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; }
