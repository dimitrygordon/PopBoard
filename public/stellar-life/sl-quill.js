// Stellar Life Cycle VR v2: the animated 3D quill overlay (Dimitry: "Keep the quill style in 3D ... there's the 3D shape, and then
// there's the quill overlay. And the quills animate. Nothing should be like flat 2D.").
// The approach is the one the live module already used for its 3D stars (round 7 to 12): stroke ribbons built as geometry rooted
// on a unit sphere with sl-strokes.js Builder (buildStar's surface strokes, spherePath-style paths), each ribbon widened across
// its own tangent in the vertex shader (sl-shaders.js strokeVert) and stepping to a new boil offset 8 times a second.
// Five stroke sets, all real geometry around the sphere and none of them a camera-facing card:
//   kind 0 SURFACE  quill strokes lying on the sphere (buildStar), turning with the surface, shown on the near side only
//   kind 1 HALO     a few short low-alpha strokes lying tangent to the limb (no outward spikes; the glow is the bloom shell)
//   kind 2 RIM      short broken strokes hugging the sphere, seen only where they cross the silhouette: the boiling ink rim
//   kind 3 WIND     short tangent arcs drifting outward and fading (winds off giants)
//   kind 4 PROM     the Sun's H-alpha prominence braid and the red supergiant's wisps, rooted on the limb
import { Builder, buildStar, randDir, cross, norm, rng } from "./sl-strokes.js";

export const QUILL = Object.freeze({ SURFACE: 0, HALO: 1, RIM: 2, WIND: 3, PROM: 4, ink: 0.35 });
const lerp = (a, b, t) => a + (b - a) * t;

/** Surface quills: the live module's buildStar strokes (fewer of them, the baked texture carries the fine paint underneath). */
export function buildQuillSurface(seed = 21) { return buildStar(seed, { broad: 150, medium: 420, hi: 140 }); }

function tangentBasis(d) { let e1 = cross([0, 1, 0], d); if (Math.hypot(...e1) < 1e-3) e1 = [1, 0, 0]; e1 = norm(e1); return [e1, cross(d, e1)]; }

/** Limb quills (Leo, round 2: "no fur"): a few short, low-alpha strokes lying TANGENT to the limb and curving with it, never
 *  sticking out. Built in the limb plane (the group is turned so its +z points at the viewer, like the labels), at 1.02 to
 *  1.07 R with a little depth, so they always sit along the silhouette. The glow itself is the bloom shell in sl-world.js. */
export function buildQuillHalo(seed = 23, n = 9) {
  const R = rng(seed); const b = new Builder(8);
  for (let i = 0; i < n; i++) {
    const a0 = (i + R() * 0.7) / n * Math.PI * 2, span = lerp(0.14, 0.32, R()), rr = lerp(1.02, 1.07, R()), z = (R() - 0.5) * 0.12; const pts = [];
    for (let j = 0; j <= 6; j++) { const a = a0 + (j / 6 - 0.5) * span, r = rr + 0.006 * Math.sin(Math.PI * j / 6); pts.push([Math.cos(a) * r, Math.sin(a) * r, z]); }
    b.add(pts, { width: lerp(0.010, 0.018, R()), raw: [lerp(0.95, 1.05, R()), 0, 0], alpha: lerp(0.12, 0.22, R()), kind: QUILL.HALO, bristles: 3, boil: 0.003, seed: R() * 1000 + i });
  }
  return b;
}

/** The Sun's prominence: a painted H-alpha loop (#FF5A6A to #FF7A8E), a braid of strands rooted on the limb at both feet and
 *  rising about 0.3 R, built in the limb plane with real depth (the strands twist around each other in 3D). */
export function buildProminence(seed = 43, loops = [[0.95, 0.42, 0.30], [3.75, 0.22, 0.12]]) {
  const R = rng(seed); const b = new Builder(24);
  loops.forEach(([a0, span, h], li) => { const ns = li ? 4 : 7;
    for (let s = 0; s < ns; s++) { const ph = s / ns * Math.PI * 2, tw = 0.026 + 0.012 * R(); const pts = [];
      for (let j = 0; j <= 16; j++) { const f = j / 16, a = a0 + (f - 0.5) * span, r = 1.0 + h * Math.sin(Math.PI * f) + 0.004; const k = Math.sin(Math.PI * f);
        const tws = tw * (0.35 + 0.65 * k), q = ph + f * Math.PI * 5; pts.push([Math.cos(a) * (r + tws * Math.cos(q)), Math.sin(a) * (r + tws * Math.cos(q)), tws * Math.sin(q) * 1.4]); }
      b.add(pts, { width: lerp(0.026, 0.042, R()) * (li ? 0.7 : 1), raw: [1, R(), 0], alpha: lerp(0.6, 0.9, R()), kind: QUILL.PROM, bristles: 4, boil: 0.005, seed: R() * 1000 + s + li * 50 }); } });
  return b;
}

/** Red supergiant wisps (LOOK-SPEC 5, "RSG prominences v2.1"): 5 groups of 1 or 2 short wisps starting on the limb, 0.04 to
 *  0.095 R long, leaning at most 0.22 rad, about 45 percent short loops that rise and fall (sin(pi t), hook 0.28 to 0.60 rad). */
export function buildWisps(seed = 47) {
  const R = rng(seed); const b = new Builder(10);
  for (let g = 0; g < 5; g++) { const ag = (g + R() * 0.8) / 5 * Math.PI * 2; const nw = R() < 0.5 ? 1 : 2;
    for (let w = 0; w < nw; w++) { const a0 = ag + (R() - 0.5) * 0.12, L = lerp(0.04, 0.095, R()), lean = (R() - 0.5) * 0.44, loop = R() < 0.45, hook = lerp(0.28, 0.6, R()) * (R() < 0.5 ? -1 : 1); const pts = [];
      for (let j = 0; j <= 6; j++) { const t = j / 6; const r = 1.0 + (loop ? L * Math.sin(Math.PI * t) : L * t); const a = a0 + (loop ? hook * t * L : Math.sin(lean) * L * t); pts.push([Math.cos(a) * r, Math.sin(a) * r, (R() - 0.5) * 0.02]); }
      b.add(pts, { width: lerp(0.032, 0.063, R()), raw: [1, R(), 0], alpha: lerp(0.14, 0.26, R()), kind: QUILL.PROM, bristles: 6, boil: 0.004, seed: R() * 1000 + g * 10 + w }); } }
  return b;
}

/** Rim quills: short arcs lying on the sphere just above the surface; only the ones crossing the silhouette show, as a broken ink line. */
export function buildQuillRim(seed = 29, n = 300, ink = QUILL.ink) {
  const R = rng(seed); const b = new Builder(6);
  for (let i = 0; i < n; i++) {
    const d = randDir(R); const [e1, e2] = tangentBasis(d); const ang = R() * Math.PI * 2; const t = [0, 1, 2].map((k) => e1[k] * Math.cos(ang) + e2[k] * Math.sin(ang));
    const L = lerp(0.08, 0.22, R()), rr = lerp(1.004, 1.012, R()); const pts = [];
    for (let j = 0; j <= 4; j++) { const a = (j / 4 - 0.5) * L; pts.push(norm([0, 1, 2].map((k) => d[k] * Math.cos(a) + t[k] * Math.sin(a))).map((v) => v * rr)); }
    b.add(pts, { width: lerp(0.006, 0.012, R()), raw: [ink * lerp(0.9, 1.1, R()), 0, 0], alpha: lerp(0.75, 1.0, R()), kind: QUILL.RIM, bristles: 2, boil: 0.004, seed: R() * 1000 + i });
  }
  return b;
}

/** Wind quills: short arcs lying tangent to the limb (in the limb plane) that the shader drifts outward and fades. No spikes. */
export function buildQuillWind(seed = 31, n = 26) {
  const R = rng(seed); const b = new Builder(6);
  for (let i = 0; i < n; i++) { const a0 = R() * Math.PI * 2, span = lerp(0.1, 0.24, R()), r0 = lerp(1.03, 1.12, R()), z = (R() - 0.5) * 0.1; const pts = [];
    for (let j = 0; j <= 4; j++) { const a = a0 + (j / 4 - 0.5) * span; pts.push([Math.cos(a) * r0, Math.sin(a) * r0, z]); }
    b.add(pts, { width: lerp(0.008, 0.016, R()), raw: [lerp(0.85, 1.0, R()), 0, 0], alpha: lerp(0.12, 0.24, R()), kind: QUILL.WIND, bristles: 3, boil: 0.004, seed: R() * 1000 + i }); }
  return b;
}

const QUILL_VERT = /* glsl */`
attribute vec3 aTan; attribute vec3 aUvK; attribute vec4 aA; attribute vec4 aColor; attribute vec4 aParam;
uniform float uBoilT; uniform float uBoil; uniform float uT; uniform float uLen; uniform float uMinW;
varying vec2 vUV; varying vec4 vCol; varying float vVis; varying vec3 vVP; varying float vKind; varying float vSeed; varying float vBr;
float qh(float n){ return fract(sin(n * 12.9898 + 78.233) * 43758.5453); }
void main(){
  float side = aA.x, w = aA.y, seed = aA.w, kind = aUvK.z; vec3 p = position; float fade = 1.0;
  float st = floor(uBoilT * 8.0) * uBoil;   // 8 fps boil; Calm lines holds it
  float r0 = length(p); vec3 d = p / max(r0, 1e-5);
  if (kind > 2.5 && kind < 3.5) { float su = fract(uT * 0.22 + qh(seed)); p = p * (1.0 + su * 0.35 * uLen / max(r0, 1e-3)); fade = pow(max(sin(3.14159265 * su), 0.0), 1.2); }
  p += (vec3(qh(seed + st * 1.7), qh(seed * 1.3 + st * 2.1), qh(seed * 0.7 + st * 3.3)) - 0.5) * aParam.y;
  vec4 vp = modelViewMatrix * vec4(p, 1.0); float sc = length(modelViewMatrix[0].xyz);
  vec3 tv = normalize(mat3(modelViewMatrix) * aTan); vec3 sd = cross(tv, normalize(vp.xyz)); float sl = length(sd); sd = sl > 1e-4 ? sd / sl : vec3(1.0, 0.0, 0.0);
  float ww = max(w * sc, uMinW * -vp.z);   // never thinner than about a pixel
  vec3 nrm = normalize(mat3(modelViewMatrix) * d); float mu = dot(nrm, -normalize(vp.xyz));
  vVis = kind < 0.5 ? smoothstep(0.04, 0.22, mu) : 1.0;
  vp.xyz += sd * side * ww * 0.5; vVP = vp.xyz;   // the widened edge itself is gated, so no ribbon pokes past the limb
  vUV = vec2(aUvK.x, aUvK.y); vCol = vec4(aColor.rgb, aColor.a * fade); vKind = kind; vSeed = seed; vBr = aParam.z;
  gl_Position = projectionMatrix * vp; }`;
const QUILL_FRAG = /* glsl */`
uniform vec3 uBase; uniform vec3 uBase2; uniform float uExpo; uniform float uAlpha; uniform vec3 uCtr; uniform float uRadV; uniform float uBoilT; uniform float uBoil;
varying vec2 vUV; varying vec4 vCol; varying float vVis; varying vec3 vVP; varying float vKind; varying float vSeed; varying float vBr;
float qh(float n){ return fract(sin(n * 12.9898 + 78.233) * 43758.5453); }
void main(){
  vec3 Dv = normalize(vVP); float rr = length(uCtr - Dv * dot(uCtr, Dv)) / max(uRadV, 1e-6); float vis = vVis;   // how far this pixel's view ray passes from the centre, in radii (1 = the limb, perspective-exact)
  if (vKind > 0.5 && vKind < 1.5 || vKind > 2.5 && vKind < 3.5) vis *= smoothstep(0.995, 1.02, rr);       // limb and wind quills: off the disc only
  if (vKind > 3.5) vis *= smoothstep(0.975, 1.0, rr);
  if (vKind < 0.5) vis *= 1.0 - smoothstep(0.985, 1.0, rr);                                                 // surface quills never poke out past the limb (no fur)                                                       // prominences: rooted on the limb, rising off it
  if (vKind > 1.5 && vKind < 2.5) vis *= smoothstep(0.95, 0.99, rr) * (1.0 - smoothstep(1.025, 1.06, rr));   // rim: only across the silhouette
  float st = floor(uBoilT * 8.0) * uBoil;
  float bristle = 0.62 + 0.38 * step(0.32, fract(vUV.x * max(vBr, 1.0) + qh(vSeed + floor(vUV.y * 6.0) + st)));   // dry-brush bristle gaps
  float a = vCol.a * uAlpha * vis * bristle; if (a < 0.01) discard;
  vec3 col = vKind > 3.5 ? mix(uBase, uBase2, vCol.g) : uBase * vCol.r;   // darkened only by multiply (the rim is the star's hue x 0.35); prominences paint between two hues
  if (uExpo > 1.001) { vec3 l = pow(max(col, vec3(0.0)), vec3(2.2)) * uExpo; float o = max(max(l.r, l.g), l.b) - 1.0; if (o > 0.0) l = min(l, vec3(1.0)) + o * 0.9; col = pow(min(l, vec3(1.0)), vec3(1.0 / 2.2)); }   // the star's exposure
  gl_FragColor = vec4(min(col, vec3(1.0)) * a, a); }`;

/** One quill stroke set as a mesh. Shares the boil clock; uCtr and uRadV (view-space centre and radius of the sphere) gate visibility. */
export function quillMesh(THREE, builder, uni, order = 12, additive = false) {
  const m = new THREE.Mesh(builder.geometry(THREE), new THREE.ShaderMaterial({ vertexShader: QUILL_VERT, fragmentShader: QUILL_FRAG, transparent: true, depthWrite: false, depthTest: true, side: THREE.DoubleSide, premultipliedAlpha: true, blending: additive ? THREE.AdditiveBlending : THREE.NormalBlending,
    uniforms: { uBoilT: uni.uBoilT, uBoil: uni.uBoil, uT: { value: 0 }, uLen: { value: 1 }, uMinW: { value: 0.0015 }, uBase: { value: new THREE.Color(1, 1, 1) }, uBase2: { value: new THREE.Color(1, 1, 1) }, uExpo: { value: 1 }, uAlpha: { value: 1 }, uCtr: { value: new THREE.Vector3() }, uRadV: { value: 1 } } }));
  m.frustumCulled = false; m.renderOrder = order; m.userData.strokes = builder.n; return m;
}
