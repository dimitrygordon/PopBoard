// Stellar Life Cycle VR v2: the animated 3D quill overlay (Dimitry: "Keep the quill style in 3D ... there's the 3D shape, and then
// there's the quill overlay. And the quills animate. Nothing should be like flat 2D.").
// The approach is the one the live module already used for its 3D stars (round 7 to 12): stroke ribbons built as geometry rooted
// on a unit sphere with sl-strokes.js Builder (buildStar's surface strokes, spherePath-style paths), each ribbon widened across
// its own tangent in the vertex shader (sl-shaders.js strokeVert) and stepping to a new boil offset 8 times a second.
// Four stroke sets, all real geometry around the sphere and none of them a camera-facing card:
//   kind 0 SURFACE  quill strokes lying on the sphere (buildStar), turning with the surface, shown on the near side only
//   kind 1 HALO     radial quills standing out of the surface, 1.05 to 1.2 R, boiling in length; they never turn with the surface
//   kind 2 RIM      short broken strokes hugging the sphere, seen only where they cross the silhouette: the boiling ink rim
//   kind 3 WIND     short radial quills drifting outward and fading (winds off giants)
import { Builder, buildStar, randDir, cross, norm, rng } from "./sl-strokes.js";

export const QUILL = Object.freeze({ SURFACE: 0, HALO: 1, RIM: 2, WIND: 3, ink: 0.35 });
const lerp = (a, b, t) => a + (b - a) * t;

/** Surface quills: the live module's buildStar strokes (fewer of them, the baked texture carries the fine paint underneath). */
export function buildQuillSurface(seed = 21) { return buildStar(seed, { broad: 150, medium: 420, hi: 140 }); }

function tangentBasis(d) { let e1 = cross([0, 1, 0], d); if (Math.hypot(...e1) < 1e-3) e1 = [1, 0, 0]; e1 = norm(e1); return [e1, cross(d, e1)]; }

/** Halo quills: radial strokes from the surface out to 1.05 to 1.2 R, with a slight curl. */
export function buildQuillHalo(seed = 23, n = 560) {
  const R = rng(seed); const b = new Builder(6);
  for (let i = 0; i < n; i++) {
    const d = randDir(R); const [e1, e2] = tangentBasis(d); const L = lerp(0.05, 0.2, Math.pow(R(), 1.4)); const ang = R() * Math.PI * 2, curl = (R() - 0.5) * 0.25 * L;
    const t = [0, 1, 2].map((k) => e1[k] * Math.cos(ang) + e2[k] * Math.sin(ang)); const pts = [];
    for (let j = 0; j <= 4; j++) { const f = j / 4, r = 1.0 + L * f; pts.push([0, 1, 2].map((k) => d[k] * r + t[k] * curl * f * f)); }
    b.add(pts, { width: lerp(0.012, 0.026, R()), raw: [lerp(0.95, 1.08, R()), 0, 0], alpha: lerp(0.55, 0.9, R()), kind: QUILL.HALO, bristles: 3, boil: 0.003, seed: R() * 1000 + i });
  }
  return b;
}

/** Rim quills: short arcs lying on the sphere just above the surface; only the ones crossing the silhouette show, as a broken ink line. */
export function buildQuillRim(seed = 29, n = 300, ink = QUILL.ink) {
  const R = rng(seed); const b = new Builder(6);
  for (let i = 0; i < n; i++) {
    const d = randDir(R); const [e1, e2] = tangentBasis(d); const ang = R() * Math.PI * 2; const t = [0, 1, 2].map((k) => e1[k] * Math.cos(ang) + e2[k] * Math.sin(ang));
    const L = lerp(0.08, 0.22, R()), rr = lerp(1.004, 1.012, R()); const pts = [];
    for (let j = 0; j <= 4; j++) { const a = (j / 4 - 0.5) * L; pts.push(norm([0, 1, 2].map((k) => d[k] * Math.cos(a) + t[k] * Math.sin(a))).map((v) => v * rr)); }
    b.add(pts, { width: lerp(0.010, 0.02, R()), raw: [ink * lerp(0.9, 1.1, R()), 0, 0], alpha: lerp(0.75, 1.0, R()), kind: QUILL.RIM, bristles: 2, boil: 0.004, seed: R() * 1000 + i });
  }
  return b;
}

/** Wind quills: short radial strokes that the shader drifts outward and fades. */
export function buildQuillWind(seed = 31, n = 320) {
  const R = rng(seed); const b = new Builder(4);
  for (let i = 0; i < n; i++) { const d = randDir(R); const r0 = lerp(1.03, 1.15, R()), L = lerp(0.06, 0.16, R()); const pts = [0, 1, 2, 3].map((j) => d.map((v) => v * (r0 + L * j / 3)));
    b.add(pts, { width: lerp(0.01, 0.022, R()), raw: [lerp(0.85, 1.0, R()), 0, 0], alpha: lerp(0.4, 0.75, R()), kind: QUILL.WIND, bristles: 3, boil: 0.004, seed: R() * 1000 + i }); }
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
  if (kind > 0.5 && kind < 1.5) { float ext = (r0 - 1.0) * uLen * (0.82 + 0.36 * qh(seed + st)); p = d * (1.0 + ext); }
  if (kind > 2.5 && kind < 3.5) { float su = fract(uT * 0.22 + qh(seed)); p = d * (r0 + su * 0.5 * uLen); fade = pow(max(sin(3.14159265 * su), 0.0), 1.2); }
  p += (vec3(qh(seed + st * 1.7), qh(seed * 1.3 + st * 2.1), qh(seed * 0.7 + st * 3.3)) - 0.5) * aParam.y;
  vec4 vp = modelViewMatrix * vec4(p, 1.0); float sc = length(modelViewMatrix[0].xyz);
  vec3 tv = normalize(mat3(modelViewMatrix) * aTan); vec3 sd = cross(tv, normalize(vp.xyz)); float sl = length(sd); sd = sl > 1e-4 ? sd / sl : vec3(1.0, 0.0, 0.0);
  float ww = max(w * sc, uMinW * -vp.z);   // never thinner than about a pixel
  vec3 nrm = normalize(mat3(modelViewMatrix) * d); float mu = dot(nrm, -normalize(vp.xyz));
  vVis = kind < 0.5 ? smoothstep(0.04, 0.22, mu) : 1.0;
  vVP = vp.xyz; vp.xyz += sd * side * ww * 0.5;
  vUV = vec2(aUvK.x, aUvK.y); vCol = vec4(aColor.rgb, aColor.a * fade); vKind = kind; vSeed = seed; vBr = aParam.z;
  gl_Position = projectionMatrix * vp; }`;
const QUILL_FRAG = /* glsl */`
uniform vec3 uBase; uniform float uAlpha; uniform vec3 uCtr; uniform float uRadV; uniform float uBoilT; uniform float uBoil;
varying vec2 vUV; varying vec4 vCol; varying float vVis; varying vec3 vVP; varying float vKind; varying float vSeed; varying float vBr;
float qh(float n){ return fract(sin(n * 12.9898 + 78.233) * 43758.5453); }
void main(){
  float rr = length(vVP.xy - uCtr.xy) / max(uRadV, 1e-6); float vis = vVis;
  if (vKind > 0.5 && vKind < 1.5 || vKind > 2.5) vis *= smoothstep(0.985, 1.02, rr);                       // halo and wind: off the disc only
  if (vKind > 1.5 && vKind < 2.5) vis *= smoothstep(0.95, 0.99, rr) * (1.0 - smoothstep(1.025, 1.06, rr));   // rim: only across the silhouette
  float st = floor(uBoilT * 8.0) * uBoil;
  float bristle = 0.62 + 0.38 * step(0.32, fract(vUV.x * max(vBr, 1.0) + qh(vSeed + floor(vUV.y * 6.0) + st)));   // dry-brush bristle gaps
  float a = vCol.a * uAlpha * vis * bristle; if (a < 0.01) discard;
  vec3 col = uBase * vCol.r;   // darkened only by multiply (the rim is the star's hue x 0.35)
  gl_FragColor = vec4(min(col, vec3(1.0)) * a, a); }`;

/** One quill stroke set as a mesh. Shares the boil clock; uCtr and uRadV (view-space centre and radius of the sphere) gate visibility. */
export function quillMesh(THREE, builder, uni, order = 12) {
  const m = new THREE.Mesh(builder.geometry(THREE), new THREE.ShaderMaterial({ vertexShader: QUILL_VERT, fragmentShader: QUILL_FRAG, transparent: true, depthWrite: false, depthTest: true, side: THREE.DoubleSide, premultipliedAlpha: true,
    uniforms: { uBoilT: uni.uBoilT, uBoil: uni.uBoil, uT: { value: 0 }, uLen: { value: 1 }, uMinW: { value: 0.0015 }, uBase: { value: new THREE.Color(1, 1, 1) }, uAlpha: { value: 1 }, uCtr: { value: new THREE.Vector3() }, uRadV: { value: 1 } } }));
  m.frustumCulled = false; m.renderOrder = order; m.userData.strokes = builder.n; return m;
}
