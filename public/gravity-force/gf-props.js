// Gravity Force Lab VR: S3 props at real size (metres, Y up, origin at floor contact, front = +Z).
// Angelo's four meshopt GLBs are hosted with the site in gravity-force/models/ (Dimitry's exception, relayed by Angelo
// on 2026-11-28: spring scale v4.2, balance v2.2, robot v3.2, step platform; nothing else of Angelo's is committed).
// MODEL_BASE is relative to this module, so it works on popboard.us and on every branch preview. The code-built props
// below draw first and stay as the fallback when a GLB fails to load (offline, old browser, decoder error).
export const MODEL_BASE = "models/";
export const MODEL_FILES = Object.freeze({ spring_scale: "spring_scale_meshopt.glb", balance: "balance_meshopt.glb", robot: "robot_meshopt.glb", step_platform: "step_platform_meshopt.glb" });
export const PROP_SIZE = Object.freeze({
  scale: { w: 0.30, d: 0.30, h: 0.051, dialR: 0.05 },
  platform: { r: 0.25, h: 0.03 },
  balance: { baseW: 0.24, baseD: 0.13, column: 0.284, beam: 0.30, pan: 0.141, plate: [0.08, 0.028] },
  robot: { h: 1.267, w: 0.618 },
  traveler: { h: 1.6, legs: 0.8 },
});
export const INK = "#2A2420", CREAM = "#F3E9D2";
const C = { navy: 0x1F2D5C, navy2: 0x283A72, brass: 0xB8893A, cream: 0xF3E9D2, mat: 0x3A3530, red: 0xC8453A, wood: 0xD9B98A, wood2: 0xC4A06C, ink: 0x2A2420, suit: 0xC9D0E6, suit2: 0x8E98BE, visor: 0x141A33 };

/** Canvas texture with numerals in Leo's readout style: Inter semibold, tabular figures, warm ink on cream. */
export function numeralTexture(THREE, main, sub, w = 512, h = 256) {
  const c = document.createElement("canvas"); c.width = w; c.height = h; const g = c.getContext("2d");
  const tex = new THREE.CanvasTexture(c); tex.colorSpace = THREE.SRGBColorSpace; tex.anisotropy = 4;
  tex.userData.draw = (m, s) => {
    g.clearRect(0, 0, w, h); g.fillStyle = CREAM; g.fillRect(0, 0, w, h);
    const sh = g.createLinearGradient(0, 0, 0, h * 0.18); sh.addColorStop(0, "rgba(42,36,32,0.02)"); sh.addColorStop(1, "rgba(42,36,32,0)"); g.fillStyle = sh; g.fillRect(0, 0, w, h);
    g.fillStyle = INK; g.textAlign = "center"; g.textBaseline = "middle";
    if ("fontVariantNumeric" in g) g.fontVariantNumeric = "tabular-nums";
    const px = s ? h * 0.46 : h * 0.6; g.font = `600 ${px}px Inter, system-ui, sans-serif`;
    let fit = px; while (g.measureText(m).width > w * 0.92 && fit > 10) { fit -= 4; g.font = `600 ${fit}px Inter, system-ui, sans-serif`; }
    g.fillText(m, w / 2, s ? h * 0.38 : h / 2);
    if (s) { g.globalAlpha = 0.7; g.font = `400 ${fit * 0.6}px Inter, system-ui, sans-serif`; g.fillText(s, w / 2, h * 0.78, w * 0.94); g.globalAlpha = 1; }
    tex.needsUpdate = true;
  };
  tex.userData.draw(main, sub); return tex;
}

function mat(THREE, color, o = {}) { return new THREE.MeshLambertMaterial({ color, ...o }); }
function box(THREE, w, h, d, color) { const m = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), mat(THREE, color)); return m; }
function cyl(THREE, rt, rb, h, color, seg = 32) { return new THREE.Mesh(new THREE.CylinderGeometry(rt, rb, h, seg), mat(THREE, color)); }
function rounded(THREE, w, h, d, r, color) {
  const s = new THREE.Shape(); const x = -w / 2, z = -d / 2;
  s.moveTo(x + r, z); s.lineTo(x + w - r, z); s.quadraticCurveTo(x + w, z, x + w, z + r); s.lineTo(x + w, z + d - r); s.quadraticCurveTo(x + w, z + d, x + w - r, z + d);
  s.lineTo(x + r, z + d); s.quadraticCurveTo(x, z + d, x, z + d - r); s.lineTo(x, z + r); s.quadraticCurveTo(x, z, x + r, z);
  const g = new THREE.ExtrudeGeometry(s, { depth: h, bevelEnabled: true, bevelThickness: Math.min(0.006, h * 0.2), bevelSize: 0.006, bevelSegments: 3, curveSegments: 8 });
  g.rotateX(Math.PI / 2); g.translate(0, h, 0); return new THREE.Mesh(g, mat(THREE, color));
}

/** Wooden step platform: round deck 0.50 m across, 0.030 m tall. */
export function stepPlatform(THREE, deckColor = C.wood) {
  const g = new THREE.Group(); g.name = "step_platform";
  const d = cyl(THREE, PROP_SIZE.platform.r, PROP_SIZE.platform.r * 1.02, PROP_SIZE.platform.h, deckColor, 48); d.position.y = PROP_SIZE.platform.h / 2; g.add(d);
  const rim = new THREE.Mesh(new THREE.TorusGeometry(PROP_SIZE.platform.r * 0.985, 0.004, 6, 64), mat(THREE, C.wood2)); rim.rotation.x = Math.PI / 2; rim.position.y = PROP_SIZE.platform.h; g.add(rim);
  return g;
}

/** Bathroom-style spring scale, 0.30 x 0.30 m. Dial 12 o'clock toward -Z. setReading(n, main, sub) turns the needle and redraws the plate. */
export function springScale(THREE) {
  const S = PROP_SIZE.scale; const g = new THREE.Group(); g.name = "spring_scale";
  g.add(rounded(THREE, S.w, 0.038, S.d, 0.035, C.navy));
  const mat2 = rounded(THREE, S.w * 0.84, 0.006, S.d * 0.62, 0.02, C.mat); mat2.position.set(0, 0.038, -0.035); g.add(mat2);
  for (let i = 0; i < 11; i++) { const rib = box(THREE, S.w * 0.78, 0.004, 0.006, 0x4A443D); rib.position.set(0, 0.046, -0.035 - S.d * 0.27 + i * S.d * 0.054); g.add(rib); }
  const dz = 0.074 + 0.02;
  const bezel = cyl(THREE, S.dialR + 0.007, S.dialR + 0.008, 0.012, C.brass, 48); bezel.position.set(0, 0.042, dz); g.add(bezel);
  const face = cyl(THREE, S.dialR, S.dialR, 0.002, C.cream, 48); face.position.set(0, 0.0485, dz); g.add(face);
  // ticks: 51 over 270 degrees, 11 major, zero tick heavier
  for (let i = 0; i <= 50; i++) {
    const phi = (-135 + 270 * i / 50) * Math.PI / 180; const major = i % 5 === 0; const len = major ? 0.010 : 0.005;
    const t = box(THREE, i === 0 ? 0.0022 : major ? 0.0016 : 0.0009, 0.0008, len, C.ink); const rr = S.dialR - 0.003 - len / 2;
    t.position.set(dz * 0 + Math.sin(phi) * rr, 0.0499, dz - Math.cos(phi) * rr); t.rotation.y = -phi; g.add(t);
  }
  const needle = new THREE.Group(); needle.position.set(0, 0.0506, dz);
  const nb = box(THREE, 0.0018, 0.0008, S.dialR * 0.86, C.red); nb.position.z = -S.dialR * 0.36; needle.add(nb); g.add(needle);
  const hub = new THREE.Mesh(new THREE.SphereGeometry(0.0055, 16, 10), mat(THREE, C.brass)); hub.scale.y = 0.6; hub.position.set(0, 0.0508, dz); g.add(hub);
  const tex = numeralTexture(THREE, "0 N", "about 0 lb", 384, 200);
  const plate = new THREE.Mesh(new THREE.PlaneGeometry(0.040, 0.021), new THREE.MeshBasicMaterial({ map: tex, toneMapped: false }));
  plate.rotation.x = -Math.PI / 2; plate.position.set(0, 0.0503, dz + 0.027); g.add(plate);
  const lens = new THREE.Mesh(new THREE.CircleGeometry(S.dialR + 0.004, 40), new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.08, depthWrite: false })); lens.rotation.x = -Math.PI / 2; lens.position.set(0, 0.0525, dz); g.add(lens);
  g.userData.setReading = (angleY, main, sub) => { needle.rotation.y = -dialClockDeg(angleY) * Math.PI / 180; tex.userData.draw(main, sub); };
  g.userData.needle = needle; g.userData.footTop = 0.0485;
  return g;
}
/** Dial clock angle (degrees from 12 o'clock, clockwise seen from above) for Angelo's needle law angle_Y = -45 - 270 f. */
export function dialClockDeg(angleY) { return -135 + (-45 - angleY); }

/** Equal-arm balance: base 0.24 x 0.13 m, column to 0.284 m, beam 0.30 m, pans 0.141 m across. Shows kg only. */
export function balance(THREE) {
  const B = PROP_SIZE.balance; const g = new THREE.Group(); g.name = "balance";
  const base = rounded(THREE, B.baseW, 0.03, B.baseD, 0.015, C.navy); base.position.y = 0.004; g.add(base);
  for (const [x, z] of [[-0.1, -0.05], [0.1, -0.05], [-0.1, 0.05], [0.1, 0.05]]) { const f = cyl(THREE, 0.008, 0.008, 0.004, C.brass, 12); f.position.set(x, 0.002, z); g.add(f); }
  const col = cyl(THREE, 0.008, 0.012, B.column - 0.034, C.brass, 20); col.position.y = 0.034 + (B.column - 0.034) / 2; g.add(col);
  const beam = new THREE.Group(); beam.position.y = B.column; g.add(beam);
  const bar = box(THREE, B.beam, 0.008, 0.008, C.brass); beam.add(bar);
  const pointer = box(THREE, 0.003, 0.11, 0.003, C.ink); pointer.position.set(0, -0.06, 0.012); beam.add(pointer);
  for (const s of [-1, 1]) {
    const hang = new THREE.Group(); hang.position.x = s * B.beam / 2 * 0.94; beam.add(hang);
    for (const a of [0, 2.1, 4.2]) { const w = new THREE.Mesh(new THREE.CylinderGeometry(0.0007, 0.0007, 0.17, 4), mat(THREE, 0x8A6A30)); w.position.set(Math.cos(a) * 0.03, -0.085, Math.sin(a) * 0.03); w.rotation.set(Math.sin(a) * 0.18, 0, -Math.cos(a) * 0.18); hang.add(w); }
    const pan = new THREE.Mesh(new THREE.SphereGeometry(B.pan / 2, 28, 10, 0, Math.PI * 2, Math.PI * 0.62, Math.PI * 0.38), mat(THREE, C.brass, { side: THREE.DoubleSide })); pan.position.y = -0.17 + B.pan / 2 * 0.93; hang.add(pan);
    hang.userData.pan = pan;
  }
  // 50 kg of standard masses in the left pan would not fit at real size; the pans hold a small brass weight set as a sign
  const wt = cyl(THREE, 0.014, 0.016, 0.022, C.brass, 16); wt.position.set(-B.beam / 2 * 0.94, -0.155, 0); beam.add(wt);
  const tex = numeralTexture(THREE, "50 kg", null, 512, 180);
  const plate = new THREE.Mesh(new THREE.PlaneGeometry(B.plate[0], B.plate[1]), new THREE.MeshBasicMaterial({ map: tex, toneMapped: false }));
  plate.position.set(0, 0.0433 + 0.004, 0.066); plate.rotation.x = -Math.PI / 2 + 0.525; g.add(plate);
  g.userData.plateTex = tex;
  return g;
}

/** Code-built traveler, kept alongside the robot (Angelo): a plain suited figure for the S4 elevator cab. Legs are
 * half the height (Angelo's nit: they were about 60%), hips at 0.8 m on a 1.6 m figure. */
export function traveler(THREE, h = PROP_SIZE.traveler.h) {
  const g = new THREE.Group(); g.name = "traveler"; const k = h / 1.6; const L = PROP_SIZE.traveler.legs;
  const add = (geo, color, x, y, z, sx = 1, sy = 1, sz = 1) => { const m = new THREE.Mesh(geo, mat(THREE, color)); m.position.set(x * k, y * k, z * k); m.scale.set(sx * k, sy * k, sz * k); g.add(m); return m; };
  const cap = (r, l) => new THREE.CapsuleGeometry(r, l, 6, 14);
  for (const s of [-1, 1]) { add(cap(0.06, L - 0.18), C.suit, s * 0.075, 0.06 + (L - 0.06) / 2, 0); add(new THREE.BoxGeometry(0.11, 0.06, 0.2), C.suit2, s * 0.075, 0.03, 0.03); }
  add(cap(0.17, 0.26), C.suit, 0, L + 0.28, 0, 1, 1, 0.72);
  for (const s of [-1, 1]) add(cap(0.045, 0.5), C.suit, s * 0.235, L + 0.24, 0);
  add(new THREE.SphereGeometry(0.115, 24, 16), C.suit, 0, 1.47, 0, 1, 1.08, 1);
  add(new THREE.SphereGeometry(0.09, 20, 12), C.visor, 0, 1.475, 0.04, 1, 0.75, 0.6);
  return g;
}

/** Angelo's robot v3.2, used only on the neutron star (Dimitry, t435). Built in code to the v3.2 look and
 * proportions: 1.267 m tall, cream torso and head, navy limbs, brass joints, a chest gauge screen and a visor with
 * two warm eyes. Heights follow the v3.2 front render: hip collar at 0.33 m, torso 0.48 to 0.89 m, arm pivots at
 * (+-0.250, 0.800), head pivot at 0.935 m. Origin at floor contact, faces +Z. Named nodes match the GLB (body, head,
 * arm_left, arm_right) so the MODEL_BASE swap keeps the same placement. */
export const ROBOT = Object.freeze({ h: 1.267, hip: 0.33, knee: 0.22, torso: [0.48, 0.89], shoulder: 0.8, armX: 0.25, headPivot: 0.935, footSpan: 0.26, onScale: [0, 0.0485, -0.086] });
export function robot(THREE) {
  const g = new THREE.Group(); g.name = "robot";
  const body = new THREE.Group(); body.name = "body"; g.add(body);
  const add = (parent, geo, color, x, y, z) => { const m = new THREE.Mesh(geo, mat(THREE, color)); m.position.set(x, y, z); parent.add(m); return m; };
  const R = ROBOT;
  for (const s of [-1, 1]) {
    const x = s * 0.075;
    const boot = rounded(THREE, 0.085, 0.05, 0.13, 0.025, C.navy); boot.position.set(x, 0, 0.012); body.add(boot);
    add(body, new THREE.CylinderGeometry(0.036, 0.036, 0.012, 20), C.brass, x, 0.056, 0);
    add(body, new THREE.CylinderGeometry(0.033, 0.03, R.knee - 0.06, 18), C.navy, x, 0.06 + (R.knee - 0.06) / 2, -0.008);
    add(body, new THREE.SphereGeometry(0.05, 20, 14), C.brass, x, R.knee, 0.018);
    add(body, new THREE.CylinderGeometry(0.036, 0.033, R.hip - R.knee - 0.02, 18), C.navy, x, R.knee + (R.hip - R.knee) / 2, 0);
  }
  const collar = rounded(THREE, 0.24, 0.021, 0.15, 0.05, C.brass); collar.position.y = R.hip; body.add(collar);
  const pelvis = rounded(THREE, 0.27, 0.1, 0.17, 0.05, C.navy); pelvis.position.y = R.hip + 0.018; body.add(pelvis);
  add(body, new THREE.CylinderGeometry(0.09, 0.1, 0.05, 24), C.navy2, 0, R.torso[0] - 0.02, 0);
  const torso = rounded(THREE, 0.4, R.torso[1] - R.torso[0], 0.26, 0.06, C.cream); torso.position.y = R.torso[0]; body.add(torso);
  const frame = rounded(THREE, 0.235, 0.008, 0.175, 0.03, C.brass); frame.rotation.x = Math.PI / 2; frame.position.set(0, 0.715 + 0.0875, 0.131); body.add(frame);
  const screen = add(body, new THREE.BoxGeometry(0.205, 0.145, 0.006), C.navy2, 0, 0.715, 0.137);
  const gc = document.createElement("canvas"); gc.width = 256; gc.height = 180; const gg = gc.getContext("2d");
  gg.fillStyle = "#283A72"; gg.fillRect(0, 0, 256, 180); gg.strokeStyle = CREAM; gg.lineWidth = 7; gg.beginPath(); gg.arc(92, 120, 56, Math.PI * 1.05, Math.PI * 1.95); gg.stroke();
  gg.lineWidth = 3; for (let i = 0; i <= 8; i++) { const a = Math.PI * (1.05 + 0.9 * i / 8); gg.beginPath(); gg.moveTo(92 + Math.cos(a) * 44, 120 + Math.sin(a) * 44); gg.lineTo(92 + Math.cos(a) * 54, 120 + Math.sin(a) * 54); gg.stroke(); }
  gg.strokeStyle = "#E8A85A"; gg.lineWidth = 5; gg.beginPath(); gg.moveTo(92, 120); gg.lineTo(126, 82); gg.stroke();
  gg.fillStyle = "#E8A85A"; for (let i = 0; i < 4; i++) gg.fillRect(170, 56 + i * 22, 56 - i * 10, 10);
  const gt = new THREE.CanvasTexture(gc); gt.colorSpace = THREE.SRGBColorSpace; screen.material = new THREE.MeshBasicMaterial({ map: gt }); screen.userData.noPaint = true;
  add(body, new THREE.SphereGeometry(0.016, 14, 10), C.brass, 0, 0.55, 0.13);
  add(body, new THREE.CylinderGeometry(0.05, 0.055, 0.07, 20), C.navy, 0, 0.915, 0);
  for (const s of [-1, 1]) {
    const arm = new THREE.Group(); arm.name = s > 0 ? "arm_left" : "arm_right"; arm.position.set(s * R.armX, R.shoulder, 0); g.add(arm);
    add(arm, new THREE.SphereGeometry(0.048, 18, 12), C.brass, 0, 0, 0).scale.set(1, 0.85, 1);
    add(arm, new THREE.CylinderGeometry(0.034, 0.03, 0.22, 16), C.navy, s * 0.012, -0.13, 0);
    add(arm, new THREE.CylinderGeometry(0.036, 0.036, 0.018, 16), C.brass, s * 0.014, -0.245, 0);
    const hand = add(arm, new THREE.SphereGeometry(0.042, 16, 12), C.navy, s * 0.016, -0.3, 0.004); hand.scale.set(0.9, 1.1, 0.8);
  }
  const head = new THREE.Group(); head.name = "head"; head.position.y = R.headPivot; g.add(head);
  const skull = rounded(THREE, 0.29, 0.27, 0.24, 0.07, C.cream); skull.position.y = 0.015; head.add(skull);
  const rim = new THREE.Mesh(new THREE.TorusGeometry(0.06, 0.011, 10, 32), mat(THREE, C.brass)); rim.scale.set(1.45, 0.9, 1); rim.position.set(0, 0.155, 0.122); head.add(rim);
  const visor = new THREE.Mesh(new THREE.CircleGeometry(0.06, 32), new THREE.MeshBasicMaterial({ color: C.visor })); visor.scale.set(1.45, 0.9, 1); visor.position.set(0, 0.155, 0.123); visor.userData.noPaint = true; head.add(visor);
  for (const s of [-1, 1]) { const e = new THREE.Mesh(new THREE.CircleGeometry(0.017, 18), new THREE.MeshBasicMaterial({ color: 0xF2D58A })); e.position.set(s * 0.032, 0.155, 0.125); e.userData.noPaint = true; head.add(e); }
  for (const s of [-1, 1]) add(head, new THREE.CylinderGeometry(0.03, 0.03, 0.024, 16), C.brass, s * 0.155, 0.15, 0).rotation.z = Math.PI / 2;
  add(head, new THREE.CylinderGeometry(0.005, 0.005, 0.045, 8), C.brass, 0, 0.305, 0); add(head, new THREE.SphereGeometry(0.012, 10, 8), C.brass, 0, ROBOT.h - ROBOT.headPivot - 0.012, 0);
  return g;
}

/** A slim painted ISS: a silver truss, four pairs of long navy solar blankets with a faint cell grid, and small white
 * modules in the middle (Leo's round 7 S4 station). span is the truss length in metres. Not to scale in the lab. */
export function station(THREE, span = 0.5) {
  const g = new THREE.Group(); g.name = "station"; const k = span;
  const truss = new THREE.Mesh(new THREE.BoxGeometry(k, k * 0.03, k * 0.03), mat(THREE, 0xD8DCE8)); g.add(truss);
  const cc = document.createElement("canvas"); cc.width = 64; cc.height = 256; const cg = cc.getContext("2d");
  cg.fillStyle = "#1E2D63"; cg.fillRect(0, 0, 64, 256); cg.strokeStyle = "rgba(170,190,240,0.45)"; cg.lineWidth = 2;
  for (let y = 0; y <= 256; y += 16) { cg.beginPath(); cg.moveTo(0, y); cg.lineTo(64, y); cg.stroke(); } cg.beginPath(); cg.moveTo(32, 0); cg.lineTo(32, 256); cg.stroke();
  const ct = new THREE.CanvasTexture(cc); ct.colorSpace = THREE.SRGBColorSpace;
  const pm = new THREE.MeshLambertMaterial({ map: ct, side: THREE.DoubleSide });
  for (const sx of [-0.42, -0.3, 0.3, 0.42]) for (const sz of [-1, 1]) {
    const p = new THREE.Mesh(new THREE.BoxGeometry(k * 0.085, k * 0.006, k * 0.34), pm); p.position.set(sx * k, 0, sz * k * 0.2); g.add(p);
    const mast = new THREE.Mesh(new THREE.BoxGeometry(k * 0.008, k * 0.008, k * 0.36), mat(THREE, 0xC9CED9)); mast.position.set(sx * k, k * 0.006, sz * k * 0.2); g.add(mast);
  }
  for (const [x, l, r] of [[0, 0.16, 0.035], [0.1, 0.1, 0.03], [-0.1, 0.12, 0.03]]) { const m = new THREE.Mesh(new THREE.CylinderGeometry(k * r, k * r, k * l, 16), mat(THREE, 0xF1F0EA)); m.rotation.x = Math.PI / 2; m.position.set(x * k, -k * 0.035, 0); g.add(m); }
  const rad = new THREE.Mesh(new THREE.BoxGeometry(k * 0.05, k * 0.004, k * 0.12), mat(THREE, 0xF1F0EA)); rad.position.set(0.18 * k, -k * 0.02, -k * 0.1); g.add(rad);
  return g;
}

const GLTF = {};
/** Load one of Angelo's GLBs once (GLTFLoader with the meshopt decoder). Resolves to the glTF scene or null. */
export function loadModel(THREE, name) {
  if (!MODEL_BASE || !MODEL_FILES[name]) return Promise.resolve(null);
  if (!GLTF[name]) GLTF[name] = (async () => {
    try {
      const [{ GLTFLoader }, { MeshoptDecoder }] = await Promise.all([import("../vendor/three/GLTFLoader.js"), import("../vendor/three/meshopt_decoder.mjs")]);
      const loader = new GLTFLoader(); loader.setMeshoptDecoder(MeshoptDecoder);
      const gltf = await loader.loadAsync(new URL(MODEL_BASE + MODEL_FILES[name], import.meta.url).href);
      return gltf.scene;
    } catch (e) { console.info("Gravity Force: keeping the built-in " + name + " (" + (e && e.message ? e.message : e) + ")"); return null; }
  })();
  return GLTF[name];
}
/** Clone a loaded GLB for one placement. Materials are cloned too, so per-copy readouts can differ. */
export function cloneModel(scene) {
  const c = scene.clone(true); c.traverse((o) => { if (o.isMesh) { o.material = o.material.clone(); o.material.toneMapped = false; } }); return c;
}
/** Spring scale GLB: turn the needle about the hub (Angelo: angle_Y = -45 deg - 270 deg x f) and draw the numbers on
 * the blank readout node. The needle node carries meshopt offsets, so it is rotated about the hub, not its origin. */
export function rigSpringScaleGLB(THREE, root) {
  const needle = root.getObjectByName("needle"), hub = root.getObjectByName("hub"), readout = root.getObjectByName("readout");
  if (!needle || !hub || !readout) return null;
  const P = new THREE.Vector3(hub.position.x, needle.position.y, hub.position.z); const o = needle.position.clone().sub(P); const a0 = -45 * Math.PI / 180;
  const tex = numeralTexture(THREE, "0 N", "about 0 lb", 384, 192);
  readout.material = new THREE.MeshBasicMaterial({ map: tex, toneMapped: false });
  const lens = root.getObjectByName("lens"); if (lens) lens.renderOrder = 2;
  root.userData.setReading = (angleY, main, sub) => {
    const a = angleY * Math.PI / 180; const d = a - a0; const c = Math.cos(d), s = Math.sin(d);
    needle.position.set(P.x + o.x * c + o.z * s, P.y, P.z - o.x * s + o.z * c); needle.quaternion.setFromAxisAngle(new THREE.Vector3(0, 1, 0), a);
    tex.userData.draw(main, sub);
  };
  return root;
}
/** Balance GLB: the beam pivots at (0, 0.300, 0); beam theta about +Z, pans -theta so they stay level. */
export function rigBalanceGLB(THREE, root) {
  const beam = root.getObjectByName("beam"), pl = root.getObjectByName("pan_left"), pr = root.getObjectByName("pan_right"), readout = root.getObjectByName("readout");
  if (!beam) return null;
  root.userData.setTilt = (theta) => { beam.rotation.z = theta; if (pl) pl.rotation.z = -theta; if (pr) pr.rotation.z = -theta; };
  if (readout) { const tex = numeralTexture(THREE, "50 kg", null, 512, 256); readout.material = new THREE.MeshBasicMaterial({ map: tex, toneMapped: false }); root.userData.plateTex = tex; }
  return root;
}
