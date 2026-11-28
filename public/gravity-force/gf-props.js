// Gravity Force Lab VR: S3 props, built in code at real size (metres, Y up, origin at floor contact, front = +Z).
// Sizes follow Angelo's frozen model notes (spring scale v4.2, balance v2.2, robot v3.2, step platform).
// The GLB files are not in the repo. Set MODEL_BASE to an https folder that holds them (for example
// "https://assets.example.org/gravity-force/") and each prop is swapped for Angelo's <name>_meshopt.glb when it
// loads. Empty means the code-built props below, which is the default and the tested path.
export const MODEL_BASE = "";
export const PROP_SIZE = Object.freeze({
  scale: { w: 0.30, d: 0.30, h: 0.051, dialR: 0.05 },
  platform: { r: 0.25, h: 0.03 },
  balance: { baseW: 0.24, baseD: 0.13, column: 0.284, beam: 0.30, pan: 0.141, plate: [0.08, 0.028] },
  robot: { h: 1.267, w: 0.618 },
  traveler: { h: 1.6 },
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

/** The 50 kg traveler: a neutral figure in a plain suit, no face detail, 1.6 m tall. */
export function traveler(THREE, h = PROP_SIZE.traveler.h) {
  const g = new THREE.Group(); g.name = "traveler"; const k = h / 1.6;
  const add = (geo, color, x, y, z, sx = 1, sy = 1, sz = 1) => { const m = new THREE.Mesh(geo, mat(THREE, color)); m.position.set(x * k, y * k, z * k); m.scale.set(sx * k, sy * k, sz * k); g.add(m); return m; };
  const cap = (r, l) => new THREE.CapsuleGeometry(r, l, 6, 14);
  add(cap(0.06, 0.7), C.suit, -0.075, 0.43, 0); add(cap(0.06, 0.7), C.suit, 0.075, 0.43, 0);
  add(new THREE.BoxGeometry(0.11, 0.06, 0.2), C.suit2, -0.075, 0.03, 0.03); add(new THREE.BoxGeometry(0.11, 0.06, 0.2), C.suit2, 0.075, 0.03, 0.03);
  add(cap(0.17, 0.32), C.suit, 0, 1.08, 0, 1, 1, 0.72);
  add(cap(0.045, 0.55), C.suit, -0.235, 1.02, 0); add(cap(0.045, 0.55), C.suit, 0.235, 1.02, 0);
  add(new THREE.SphereGeometry(0.115, 24, 16), C.suit, 0, 1.47, 0, 1, 1.08, 1);
  add(new THREE.SphereGeometry(0.09, 20, 12), C.visor, 0, 1.475, 0.04, 1, 0.75, 0.6);
  return g;
}

/** Angelo's robot stand-in (neutron star only), 1.267 m tall, 0.618 m wide with arms hanging. */
export function robot(THREE) {
  const g = new THREE.Group(); g.name = "robot";
  const add = (geo, color, x, y, z) => { const m = new THREE.Mesh(geo, mat(THREE, color)); m.position.set(x, y, z); g.add(m); return m; };
  for (const s of [-1, 1]) {
    add(new THREE.BoxGeometry(0.11, 0.06, 0.16), C.navy, s * 0.075, 0.03, 0.02);
    add(new THREE.CylinderGeometry(0.035, 0.04, 0.22, 16), C.navy, s * 0.075, 0.17, 0);
    add(new THREE.SphereGeometry(0.055, 16, 12), C.brass, s * 0.075, 0.31, 0.018);
    add(new THREE.CylinderGeometry(0.04, 0.035, 0.2, 16), C.navy, s * 0.075, 0.44, 0);
    add(new THREE.SphereGeometry(0.045, 14, 10), C.brass, s * 0.25, 0.8, 0);
    add(new THREE.CapsuleGeometry(0.035, 0.3, 4, 12), C.navy, s * 0.27, 0.6, 0);
    add(new THREE.SphereGeometry(0.04, 12, 10), C.brass, s * 0.27, 0.4, 0);
  }
  add(new THREE.BoxGeometry(0.14, 0.05, 0.095), C.brass, 0, 0.55, 0);
  const torso = rounded(THREE, 0.4, 0.32, 0.26, 0.05, C.cream); torso.position.y = 0.56; g.add(torso);
  add(new THREE.BoxGeometry(0.17, 0.12, 0.01), C.navy2, 0, 0.75, 0.135);
  add(new THREE.CylinderGeometry(0.03, 0.03, 0.05, 12), C.brass, 0, 0.91, 0);
  const head = rounded(THREE, 0.27, 0.22, 0.23, 0.06, C.cream); head.position.y = 0.935; g.add(head);
  add(new THREE.BoxGeometry(0.19, 0.08, 0.01), C.visor, 0, 1.05, 0.12);
  for (const s of [-1, 1]) add(new THREE.SphereGeometry(0.018, 10, 8), 0xE8EDF5, s * 0.045, 1.05, 0.127);
  for (const s of [-1, 1]) add(new THREE.CylinderGeometry(0.03, 0.03, 0.03, 12), C.brass, s * 0.145, 1.05, 0).rotation.z = Math.PI / 2;
  add(new THREE.CylinderGeometry(0.004, 0.004, 0.08, 6), C.brass, 0, 1.2, 0); add(new THREE.SphereGeometry(0.012, 10, 8), C.brass, 0, 1.255, 0);
  return g;
}

/** Optional swap to Angelo's GLB, only when MODEL_BASE is set. Resolves to the loaded scene or null. */
export async function loadModel(THREE, name) {
  if (!MODEL_BASE) return null;
  try {
    const [{ GLTFLoader }, { MeshoptDecoder }] = await Promise.all([import("../vendor/three/GLTFLoader.js"), import("../vendor/three/meshopt_decoder.mjs")]);
    const loader = new GLTFLoader(); loader.setMeshoptDecoder(MeshoptDecoder);
    const gltf = await loader.loadAsync(MODEL_BASE + name + "_meshopt.glb");
    return gltf.scene;
  } catch (e) { console.info("Gravity Force: keeping the built-in " + name + " (" + (e && e.message ? e.message : e) + ")"); return null; }
}
