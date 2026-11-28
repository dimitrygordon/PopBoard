// Stellar Life Cycle VR v2: ONE continuous 3D world for a whole life (Dimitry, round 13). Nothing here cuts between scenes:
// every piece (cloud, disk and jets, the star, winds, cutaway layers, nebula, supernova shell, white dwarf, neutron star,
// black hole) lives in the same space and fades in or out, and the view eases with a smooth log-radius dolly.
// The star is a real sphere with a painted-style shader: a painted equirect stroke texture (Leo's bakes when present,
// a code-painted placeholder until then), three boil variants crossfading at 8 fps (Calm lines holds variant 1 and only
// turns slowly), limb darkening as a shader multiply, and a broken, boiling silhouette ink rim in the star's hue x 0.35.
// The dolly is done by scaling the star world about its centre, which gives the same picture as moving the camera in a
// star-centred scene while keeping float precision from neutron star (12 km) to supernova remnant (light years).
// Every size is the model's: the star radius is MIST (or Bedard cooling) at this moment, never an eased "drawn" radius.
import { temperatureToSRGB } from "../night-sky/ns-astro.js";
import { ONION } from "./sl-strokes.js";
import { quillMesh, buildQuillSurface, buildQuillHalo, buildQuillRim, buildQuillWind, QUILL } from "./sl-quill.js";

export const RSUN_KM = 695700;
export const AU_RSUN = 1.495978707e8 / RSUN_KM;   // 215.03 Suns of radius per AU
export const KM_RSUN = 1 / RSUN_KM;
/** Sizes in Suns of radius for the drawn-not-modelled pieces (schematic sizes, labelled by the scale bar). */
export const SIZES = Object.freeze({ cloud0: 2.0e6, cloud1: 4.0e4, disk: 100 * AU_RSUN, nebula: 4.0e6, snShell: 4.0e7, ns: 12 * KM_RSUN, bhPerSun: 2.95 * KM_RSUN, bhMass: 10, earth: 6371 * KM_RSUN });
export const ORBIT_AU = Object.freeze({ Mercury: 0.387, Venus: 0.723, Earth: 1.0, Mars: 1.524, Jupiter: 5.2 });
/** Framing (Leo, style B 3D): the hero fills about 30 to 45 percent of the free view. x = radius / frame radius is that share. */
export const FRAME = Object.freeze({ star: [0.32, 0.43], wide: [0.40, 0.50], minX: 0.006, omega: 3.0, vmax: 4.0, amax: 30 });

// Angelo's sculpted pieces (unlit painted style B, meshopt GLB, Y up, 1 m unit radius, an empty "core_anchor" where our
// star sphere goes). MODEL_FILES stays empty until his files are hosted: nothing is fetched, and the code-built placeholders
// below, which use the same node names, stay. Add "name: file" here when a file lands in stellar-life/models/.
export const MODEL_BASE = "models/";
export const MODEL_FILES = Object.freeze({});
export const MODEL_NODES = Object.freeze({
  protostar: ["cloud_shell", "disk", "jet_n", "jet_s", "core_anchor"],
  planetary_nebula: ["shell_inner", "shell_outer", "halo", "core_anchor"],
  supernova_remnant: ["filaments", "shock_shell", "core_anchor"],
  pulsar_beams: ["beam_n", "beam_s", "field_lines", "spin_axis", "core_anchor"],
  blackhole_disk: ["disk", "photon_ring", "core_anchor"],
});
// Leo's painted stroke textures: tex/<star>_v<1-3>_<2k|1k>.webp (2048x1024 and 1024x512, no limb darkening baked in).
// tex/manifest.json lists the ones that exist, so a missing bake never makes a 404; until then the placeholder paints.
export const TEX_STARS = Object.freeze(["sun", "rsg", "zams15", "rg", "protostar"]);
export const texName = (star, v, lvl) => `${star}_v${v}_${lvl}.webp`;

const GLTF = {};
/** Load one of Angelo's GLBs once (GLTFLoader with the meshopt decoder, as in Gravity Force). Resolves to the glTF scene or null. */
export function loadModel(name, base = import.meta.url) {
  if (!MODEL_BASE || !MODEL_FILES[name]) return Promise.resolve(null);
  if (!GLTF[name]) GLTF[name] = (async () => {
    try {
      const [{ GLTFLoader }, { MeshoptDecoder }] = await Promise.all([import("../vendor/three/GLTFLoader.js"), import("../vendor/three/meshopt_decoder.mjs")]);
      const loader = new GLTFLoader(); loader.setMeshoptDecoder(MeshoptDecoder);
      return (await loader.loadAsync(new URL(MODEL_BASE + MODEL_FILES[name], base).href)).scene;
    } catch (e) { console.info("Stellar Life: keeping the built-in " + name + " (" + (e && e.message ? e.message : e) + ")"); return null; }
  })();
  return GLTF[name];
}
const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
const smooth = (a, b, x) => { const t = clamp((x - a) / (b - a), 0, 1); return t * t * (3 - 2 * t); };
const logLerp = (a, b, t) => Math.pow(10, Math.log10(a) + (Math.log10(b) - Math.log10(a)) * clamp(t, 0, 1));

/** Which of Leo's stroke textures a star wears now (by surface temperature, radius and stage). */
export function starTex(teff, R, scene) {
  if (scene === "disk") return "protostar";
  if (teff < 4200 && R > 250) return "rsg";
  if (teff < 5400 && R > 6) return "rg";
  if (teff > 15000) return "zams15";
  return "sun";
}
/** Limb darkening as a multiply (LOOK-SPEC: Sun limb ring about #E4D2C5 against #FFF1EA, gentle; red supergiant strong,
 *  towards #FFB05D). Returns [limb multiplier rgb, exponent]. */
export function limbFor(teff) {
  const sun = [0xE4 / 0xFF, 0xD2 / 0xF1, 0xC5 / 0xEA], rsg = [0.72, 0.62, 0.47];
  const k = smooth(5200, 3500, teff); return [sun.map((v, i) => v + (rsg[i] - v) * k), 1.6 - 0.8 * k];
}

/** What the world shows at this moment: a pure function of the flow's view (node tests run it). Sizes in Suns of radius. */
export function lookFor(v, mass, st = {}) {
  const s = v.stage || {}; const sc = v.sceneKind === "wd" ? "wd" : s.scene; const t = v.t || 0; const row = v.cooling || v.row;
  const tg = st.toggles || {};
  const L = { star: { on: false, R: 1, teff: 5772, a: 1, bright: 1, kind: "star", cut: 0, layers: null, flash: 0 }, cloud: { a: 0, r: SIZES.cloud0, ir: 0 }, disk: { a: 0, r: SIZES.disk }, jets: { a: 0 },
    nebula: { a: 0, r: 1 }, sn: { a: 0, r: 1, ghost: 0 }, ns: { a: 0, beams: 0 }, bh: { a: 0, rs: SIZES.bhPerSun * SIZES.bhMass }, earth: { a: 0 }, winds: { a: 0 }, proms: 0, orbits: [], rings: [], hero: 1, band: "star" };
  const R = row && row.logR != null ? Math.pow(10, row.logR) : 1, teff = row && row.logT != null ? Math.pow(10, row.logT) : 5772;
  const star = (o = {}) => Object.assign(L.star, { on: true, R, teff }, o);
  if (sc === "cloud") { L.cloud = { a: 1, r: SIZES.cloud0, ir: tg.ir ? 1 : 0 }; L.hero = SIZES.cloud0; L.band = "wide"; }
  else if (sc === "collapse") { const r = logLerp(SIZES.cloud0, SIZES.cloud1, t); L.cloud = { a: 1, r, ir: 0 }; L.hero = r; L.band = "wide"; if (t > 0.55) star({ R: 15, teff: 3500, a: smooth(0.55, 1, t), kind: "proto" }); }
  else if (sc === "disk") { const f3 = s.id === "F3"; star({ kind: "proto" }); L.disk = { a: f3 ? smooth(0, 0.5, t) : 1, r: SIZES.disk * (f3 ? 0.55 + 0.45 * t : 1) }; L.jets = { a: f3 ? smooth(0.1, 0.5, t) : 1 - 0.7 * t };
    if (f3) L.cloud = { a: 1 - smooth(0, 0.6, t), r: SIZES.cloud1, ir: 0 }; L.hero = L.disk.r * 1.05; L.band = "wide"; }
  else if (sc === "ignite") { star(); L.disk = { a: 1 - smooth(0, 0.8, t), r: SIZES.disk }; L.jets = { a: 0.3 * (1 - smooth(0, 0.5, t)) }; L.hero = R; }
  else if (sc === "star") { star(); L.hero = R; if (s.winds) L.winds.a = 1; L.proms = teff > 4300 && teff < 7500 && R < 3 ? 1 : 0; }
  else if (sc === "cutaway") {
    star({ cut: tg.cut === false ? 0 : 1 }); L.hero = R; const n = ONION.length;
    if (s.cut === "flash" || s.cut === "quiet") L.star.layers = { n: 2, flash: s.cut === "flash" ? Math.max(0, Math.sin(Math.PI * clamp((t - 0.3) / 0.4, 0, 1))) : 0, collapse: 0 };
    else if (s.cut === "collapse") L.star.layers = { n, flash: smooth(0.75, 0.95, t) * (1 - smooth(0.95, 1, t)), collapse: smooth(0.35, 0.8, t) };
    else L.star.layers = { n: 1 + Math.min(n - 1, Math.floor((v.onion != null ? v.onion : t) * n)), flash: 0, collapse: 0 };
  }
  else if (sc === "nebula") { star(); const r0 = Math.max(200, R); L.nebula = { a: smooth(0, 0.2, t), r: logLerp(r0 * 1.6, SIZES.nebula, Math.pow(t, 0.6)) }; L.hero = L.nebula.r * (tg.scope ? 3 : 1); L.band = "wide"; if (v.cooling) L.star.kind = "wd"; }
  else if (sc === "wd") { star({ kind: "wd" }); L.earth.a = 1; L.hero = R * 3.2; L.band = "wide"; }
  else if (sc === "supernova") { star({ a: 1 - smooth(0.04, 0.3, t), bright: 1 + 6 * (1 - smooth(0, 0.12, t)) * smooth(0, 0.02, t) }); const r = logLerp(R * 1.3, SIZES.snShell, smooth(0, 1, t)); L.sn = { a: 1, r, ghost: 0 }; L.ns = { a: smooth(0.2, 0.5, t), beams: 0 }; L.hero = r; L.band = "wide"; }
  else if (sc === "ns") { L.ns = { a: 1, beams: 1 }; L.sn = { a: 1 - smooth(0, 0.35, t), r: SIZES.snShell * (1 + 0.2 * t), ghost: 0 }; L.hero = SIZES.ns * 4; L.band = "wide"; }
  else if (sc === "twopaths") { star({ a: 1 - 0.9 * smooth(0.3, 1, t), bright: 1 - 0.5 * smooth(0.3, 1, t), R: R * (1 - 0.4 * smooth(0.4, 1, t)) }); L.sn = { a: 0.45 * smooth(0, 0.25, t) * (1 - smooth(0.85, 1, t)), r: R * (1.2 + 2.2 * smooth(0, 1, t)), ghost: 1 }; L.hero = R * 1.25; }
  else if (sc === "bh") { L.bh.a = 1; L.hero = L.bh.rs * 5; L.band = "wide"; }
  if (s.orbits) for (const p of s.orbits) if (ORBIT_AU[p]) L.orbits.push({ name: p, r: ORBIT_AU[p] * AU_RSUN });
  if (s.ref === "sunRing") L.rings.push({ r: 1, label: "the Sun's size" });
  if (s.ref === "msRing" && v.refR) L.rings.push({ r: v.refR, label: "its main-sequence size" });
  return L;
}

/** The smooth dolly (log10 of the frame radius, in Suns): a critically damped spring towards the nearest framing that keeps
 *  the hero inside its band, with a speed cap. Velocity is continuous, so it eases in and out and never jumps. */
export function bandTarget(Lf, heroR, band) { const [lo, hi] = FRAME[band] || FRAME.star; const h = Math.log10(heroR); return clamp(Lf, h - Math.log10(hi), h - Math.log10(lo)); }
export function springStep(c, target, dt, vRef = 0) {
  // vRef: how fast the target itself is moving (a fast swell): tracking it removes the lag, so the star never balloons past the frame
  const w = FRAME.omega; let a = w * w * (target - c.L) + 2 * w * (vRef - c.v); a = clamp(a, -FRAME.amax, FRAME.amax);   // capped acceleration too: it always eases in, even after a jump
  c.v += a * dt; c.v = clamp(c.v, -FRAME.vmax, FRAME.vmax); c.L += c.v * dt; return c;
}

/** One frame of the dolly towards a band target: feeds the target's own speed forward (a fast swell is tracked without lag),
 *  but a jump in the target (a new stage) is eased by the spring instead. Shared by the scene and the tests. */
export function dollyStep(cam, target, dt) {
  let vRef = 0; if (dt > 0 && cam.lastT != null) { const r = (target - cam.lastT) / dt; vRef = Math.abs(r) < 2 * FRAME.vmax ? clamp(r, -FRAME.vmax, FRAME.vmax) : 0; }
  cam.vRef = (cam.vRef || 0) + (vRef - (cam.vRef || 0)) * Math.min(1, dt * 30); cam.lastT = target; return springStep(cam, target, dt, cam.vRef);
}

// ---------------- GLSL ----------------
const NOISE = /* glsl */`
float h11(float p){ p = fract(p * 0.1031); p *= p + 33.33; p *= p + p; return fract(p); }
float h31(vec3 p){ p = fract(p * 0.1031); p += dot(p, p.zyx + 31.32); return fract((p.x + p.y) * p.z); }
float vn1(float x){ float i = floor(x), f = fract(x); f = f * f * (3.0 - 2.0 * f); return mix(h11(i), h11(i + 1.0), f); }
float vn3(vec3 p){ vec3 i = floor(p), f = fract(p); f = f * f * (3.0 - 2.0 * f);
  return mix(mix(mix(h31(i), h31(i + vec3(1,0,0)), f.x), mix(h31(i + vec3(0,1,0)), h31(i + vec3(1,1,0)), f.x), f.y),
             mix(mix(h31(i + vec3(0,0,1)), h31(i + vec3(1,0,1)), f.x), mix(h31(i + vec3(0,1,1)), h31(i + vec3(1,1,1)), f.x), f.y), f.z); }
float fbm(vec3 p){ float a = 0.5, s = 0.0; for (int i = 0; i < 4; i++) { s += a * vn3(p); p = p * 2.03 + 1.7; a *= 0.5; } return s; }
vec3 bleed(vec3 c){ float o = max(max(c.r, c.g), c.b) - 1.0; if (o > 0.0) c = min(c, vec3(1.0)) + o * 0.9; return min(c, vec3(1.0)); }
`;
const SPHERE_VERT = /* glsl */`
varying vec3 vObj; varying vec3 vVN; varying vec3 vVP;
void main(){ vObj = position; vec4 mv = modelViewMatrix * vec4(position, 1.0); vVP = mv.xyz; vVN = normalize(normalMatrix * normal); gl_Position = projectionMatrix * mv; }`;
const STAR_FRAG = /* glsl */`
uniform sampler2D uA0; uniform sampler2D uA1; uniform sampler2D uA2; uniform sampler2D uB0; uniform sampler2D uB1; uniform sampler2D uB2;
uniform vec3 uW; uniform float uMixB; uniform vec2 uMode; uniform vec3 uKA; uniform vec3 uKB; uniform vec3 uBase; uniform vec3 uLimb; uniform float uLimbK; uniform float uAmp;
uniform float uBoilT; uniform float uBoil; uniform float uRot; uniform float uPxR; uniform float uAlpha; uniform float uBright;
uniform float uCut; uniform vec3 uCtr; uniform float uRadV; uniform vec3 uInside; uniform float uInk; uniform vec3 uCore; uniform float uCoreOn;
varying vec3 vObj; varying vec3 vVN; varying vec3 vVP;
${NOISE}
vec3 tex3(sampler2D a, sampler2D b, sampler2D c, vec2 uv){ return uW.x * texture2D(a, uv).rgb + uW.y * texture2D(b, uv).rgb + uW.z * texture2D(c, uv).rgb; }
void main(){
  vec3 rel = vVP - uCtr;
  if (uCut > 0.5 && rel.x > 0.0 && rel.y > 0.0 && rel.z > 0.0) discard;   // cutaway: the octant facing the student is removed
  if (!gl_FrontFacing) { float d = length(rel) / max(uRadV, 1e-6); gl_FragColor = vec4(uInside * (0.78 + 0.22 * d), uAlpha); return; }
  vec3 n = normalize(vObj);
  vec2 uv = vec2(atan(n.z, n.x) / 6.2831853 + 0.5 + uRot, acos(clamp(n.y, -1.0, 1.0)) / 3.14159265);
  vec3 ta = tex3(uA0, uA1, uA2, uv), tb = tex3(uB0, uB1, uB2, uv);
  vec3 ca = uMode.x > 0.5 ? ta * uKA : uBase * (1.0 + uAmp * (ta.r - 0.55) * 1.3);
  vec3 cb = uMode.y > 0.5 ? tb * uKB : uBase * (1.0 + uAmp * (tb.r - 0.55) * 1.3);
  vec3 col = mix(ca, cb, uMixB);
  float mu = clamp(dot(normalize(vVN), normalize(-vVP)), 0.0, 1.0);
  col *= mix(vec3(1.0), uLimb, pow(1.0 - mu, uLimbK));
  col = mix(col, uCore, uCoreOn * pow(mu, 2.2));   // neutron star: white-hot core #F1F2F7 inside the #95B1FF edge
  col = bleed(col * uBright);
  // silhouette ink: 2 to 3 px, uneven and broken, boiling at 8 fps (held by Calm lines); the star's hue x 0.35, never black
  float r = sqrt(max(0.0, 1.0 - mu * mu)); float ang = atan(rel.y, rel.x); float bf = floor(uBoilT * 8.0) * uBoil;
  float px = 1.0 / max(uPxR, 1.0); float w = 2.5 * px * (0.55 + 0.9 * vn1(ang * 9.0 + bf * 3.7));
  float gap = step(0.3, vn1(ang * 5.3 + 11.0 + bf * 1.31));
  float ink = smoothstep(1.0 - w - px, 1.0 - w, r) * gap * uInk;
  col = mix(col, uBase * 0.35, ink);
  gl_FragColor = vec4(col, uAlpha);
}`;
const LAYER_FRAG = /* glsl */`
uniform vec3 uCol; uniform float uAlpha; uniform float uCut; uniform vec3 uCtr; uniform float uGlow; uniform float uBoilT; uniform float uBoil;
varying vec3 vObj; varying vec3 vVN; varying vec3 vVP;
${NOISE}
void main(){ vec3 rel = vVP - uCtr; if (uCut > 0.5 && rel.x > 0.0 && rel.y > 0.0 && rel.z > 0.0) discard;
  float bf = floor(uBoilT * 8.0) * uBoil; float n = fbm(normalize(vObj) * 4.0 + bf * 0.05);
  vec3 c = uCol * (gl_FrontFacing ? 0.92 : 0.78 + 0.25 * n); c = bleed(c * (1.0 + uGlow * 2.5));
  gl_FragColor = vec4(c, uAlpha); }`;
const SHELL_FRAG = /* glsl */`
uniform vec3 uCol; uniform vec3 uCol2; uniform float uAlpha; uniform float uBoilT; uniform float uBoil; uniform float uSeed; uniform float uRim; uniform float uDark;
varying vec3 vObj; varying vec3 vVN; varying vec3 vVP;
${NOISE}
void main(){ float mu = abs(dot(normalize(vVN), normalize(-vVP))); float rim = pow(1.0 - mu, uRim);
  float bf = floor(uBoilT * 8.0) * uBoil; vec3 q = normalize(vObj) * 3.2 + uSeed; float n = fbm(q + vec3(0.0, bf * 0.06, 0.0));
  float streak = smoothstep(0.42, 0.72, n); float a = (0.10 + 0.95 * rim) * (0.3 + 0.9 * streak) * uAlpha;
  vec3 c = mix(uCol, uCol2, smoothstep(0.35, 0.65, fbm(q * 0.7 + 5.0)));
  if (uDark > 0.5) { a = clamp(a * 1.6, 0.0, 0.9); gl_FragColor = vec4(c * a, a); } else gl_FragColor = vec4(c * a, a); }`;
const DISK_VERT = /* glsl */`varying vec2 vP; void main(){ vP = position.xy; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }`;
const DISK_FRAG = /* glsl */`
uniform float uT; uniform float uIn; uniform float uAlpha; uniform float uBoilT; uniform float uBoil; uniform vec3 uC0; uniform vec3 uC1; uniform vec3 uC2; uniform vec3 uC3; varying vec2 vP;
${NOISE}
void main(){ float r = length(vP); if (r < uIn || r > 1.0) discard; float ang = atan(vP.y, vP.x);
  float a2 = ang - 1.6 * pow(max(r, 0.04), -1.5) * uT;   // Keplerian shear: inner gas laps the outer gas
  float bf = floor(uBoilT * 8.0) * uBoil;
  float streak = vn3(vec3(cos(a2) * 7.0, sin(a2) * 7.0, r * 46.0 + bf * 0.15)); float gaps = smoothstep(0.18, 0.4, vn1(r * 21.0 + 3.0));
  float lr = clamp(log(r / uIn) / log(1.0 / uIn), 0.0, 1.0);
  vec3 c = mix(mix(uC0, uC1, smoothstep(0.0, 0.35, lr)), mix(uC2, uC3, smoothstep(0.55, 1.0, lr)), smoothstep(0.25, 0.65, lr));
  c *= 0.75 + 0.45 * streak; float a = (0.5 + 0.5 * streak) * gaps * (1.0 - smoothstep(0.8, 1.0, r)) * smoothstep(uIn, uIn * 1.6, r) * uAlpha;
  gl_FragColor = vec4(c * a, a); }`;
const JET_FRAG = /* glsl */`
uniform vec3 uCol; uniform float uAlpha; uniform float uT; uniform float uBoilT; uniform float uBoil; uniform float uGain; varying vec3 vObj; varying vec3 vVN; varying vec3 vVP;
${NOISE}
void main(){ float bf = floor(uBoilT * 8.0) * uBoil; float y = clamp(vObj.y, 0.0, 1.0);
  float n = vn3(vec3(vObj.x * 9.0, vObj.y * 7.0 - uT * 2.4 - bf * 0.2, vObj.z * 9.0)); float a = (0.25 + 0.75 * smoothstep(0.35, 0.7, n)) * (1.0 - y) * smoothstep(0.0, 0.06, y) * uAlpha * uGain;
  gl_FragColor = vec4(uCol * a, a); }`;
// prominences: H-alpha loops (#FF5A6A to #FF7A8E), seen only off the limb (over the disc they would read as a band)
const PROM_FRAG = /* glsl */`
uniform float uAlpha; uniform float uT; uniform vec3 uCtr; uniform float uRadV; varying vec3 vObj; varying vec3 vVN; varying vec3 vVP;
${NOISE}
void main(){ float off = smoothstep(0.98, 1.03, length(vVP.xy - uCtr.xy) / max(uRadV, 1e-6)); float n = vn3(vObj * 40.0 + vec3(0.0, uT * 0.6, 0.0));
  vec3 c = mix(vec3(1.0, 0.353, 0.416), vec3(1.0, 0.478, 0.557), n); float a = uAlpha * off * (0.55 + 0.45 * n); if (a < 0.01) discard; gl_FragColor = vec4(c * a, a); }`;
const EARTH_FRAG = /* glsl */`
uniform vec3 uSun; uniform float uPxR; uniform float uAlpha; varying vec3 vObj; varying vec3 vVN; varying vec3 vVP;
${NOISE}
void main(){ vec3 n = normalize(vObj); float land = smoothstep(0.52, 0.56, fbm(n * 2.6 + 4.0)); vec3 c = mix(vec3(0.18, 0.37, 0.66), vec3(0.42, 0.52, 0.30), land);
  c = mix(c, vec3(0.94), smoothstep(0.62, 0.75, fbm(n * 5.0 + 9.0)) * 0.7); float l = clamp(dot(normalize(vVN), normalize(uSun)), 0.0, 1.0);
  c *= 0.18 + 0.9 * l; float mu = clamp(dot(normalize(vVN), normalize(-vVP)), 0.0, 1.0); float r = sqrt(1.0 - mu * mu);
  float ink = smoothstep(1.0 - 3.0 / max(uPxR, 1.0), 1.0 - 1.5 / max(uPxR, 1.0), r); c = mix(c, vec3(0.08, 0.09, 0.14), ink); gl_FragColor = vec4(c, uAlpha); }`;

const srgb = (T) => temperatureToSRGB(T).map((x) => clamp(x, 0, 1));
const hex = (h) => [1, 3, 5].map((i) => parseInt(h.slice(i, i + 2), 16) / 255);

/** Placeholder painted stroke texture (until Leo's bakes land): luminance only, the shader multiplies the star colour.
 *  Packed bright cells with darker lanes between them, then short ribbons along a curling tangent flow; each variant moves
 *  the cells a little (the boil). Width is stretched by 1/cos(latitude) so cells stay round on the sphere. */
export function paintPlaceholder(kind, variant, W = 1024, H = 512) {
  const c = document.createElement("canvas"); c.width = W; c.height = H; const g = c.getContext("2d"); if (!g) return c;
  let s = (kind === "coarse" ? 977 : kind === "smooth" ? 433 : 211) + variant * 7919; const R = () => { s = (s * 16807) % 2147483647; return s / 2147483647; };
  const cells = kind === "coarse" ? 46 : kind === "smooth" ? 260 : 1500, cell = kind === "coarse" ? 0.16 : kind === "smooth" ? 0.05 : 0.026;
  g.fillStyle = "rgb(92,92,92)"; g.fillRect(0, 0, W, H);   // the lanes
  let s0 = (kind === "coarse" ? 977 : 211) * 3; const R0 = () => { s0 = (s0 * 16807) % 2147483647; return s0 / 2147483647; };
  for (let i = 0; i < cells; i++) {
    const u = R0(), z = R0() * 2 - 1, lat = Math.asin(z); const jx = (R() - 0.5) * cell * 0.25, jy = (R() - 0.5) * cell * 0.25;
    const x = ((u + jx) % 1) * W, y = (0.5 - lat / Math.PI + jy) * H; const rr = cell * H * (0.55 + 0.5 * R0()) * (0.85 + 0.3 * R()); const sx = 1 / Math.max(0.12, Math.cos(lat));
    const v = 150 + Math.floor(R() * 90);
    for (const dx of [-W, 0, W]) { g.save(); g.translate(x + dx, y); g.scale(sx, 1); const gr = g.createRadialGradient(0, 0, 0, 0, 0, rr); gr.addColorStop(0, `rgb(${v},${v},${v})`); gr.addColorStop(0.72, `rgb(${v - 30},${v - 30},${v - 30})`); gr.addColorStop(1, "rgba(92,92,92,0)"); g.fillStyle = gr; g.beginPath(); g.arc(0, 0, rr, 0, Math.PI * 2); g.fill(); g.restore(); }
  }
  // ribbons along the flow field
  const n = kind === "coarse" ? 900 : kind === "smooth" ? 500 : 2600; g.lineCap = "round";
  for (let i = 0; i < n; i++) {
    let x = R() * W, y = R() * H; const lat = (0.5 - y / H) * Math.PI; const sx = 1 / Math.max(0.15, Math.cos(lat)); const len = (kind === "coarse" ? 40 : 12) * (0.6 + R());
    const v = R() < 0.35 ? 60 + Math.floor(R() * 30) : 175 + Math.floor(R() * 70); g.strokeStyle = `rgba(${v},${v},${v},${0.25 + 0.35 * R()})`; g.lineWidth = (kind === "coarse" ? 5 : 2) * (0.6 + R());
    g.beginPath(); g.moveTo(x, y); for (let k = 0; k < 6; k++) { const a = Math.sin(x * 0.013 + variant) * 2.1 + Math.cos(y * 0.021) * 1.7; x += Math.cos(a) * len / 6 * sx; y += Math.sin(a) * len / 6; g.lineTo(x, y); } g.stroke();
  }
  return c;
}

export class LifeWorld {
  constructor(THREE, uni, scenes, base = import.meta.url) {
    const T = THREE; this.T = T; this.uni = uni; this.scenes = scenes; this.base = base; this.kind = "life"; this.centered = true; this.strokes = 0; this.chips = [];
    this.root = new T.Group(); this.root.name = "life_world"; this.cam = { L: 0, v: 0 }; this.fresh = true; this.radius = 0.4; this.camDist = 6;
    this.fade = {}; this.texCache = {}; this.manifest = null; this.models = {};
    const ph = this.placeholderTex(); this.texSet = { A: { name: "sun", tex: ph.fine }, B: { name: "sun", tex: ph.fine }, mix: 1 };
    // the star
    const su = { uA0: { value: ph.fine[0] }, uA1: { value: ph.fine[1] }, uA2: { value: ph.fine[2] }, uB0: { value: ph.fine[0] }, uB1: { value: ph.fine[1] }, uB2: { value: ph.fine[2] },
      uW: { value: new T.Vector3(1, 0, 0) }, uMixB: { value: 0 }, uMode: { value: new T.Vector2(0, 0) }, uKA: { value: new T.Vector3(1, 1, 1) }, uKB: { value: new T.Vector3(1, 1, 1) }, uBase: { value: new T.Color(1, 0.945, 0.918) }, uLimb: { value: new T.Vector3(0.89, 0.87, 0.84) }, uLimbK: { value: 1.6 }, uAmp: { value: 0.5 },
      uBoilT: uni.uBoilT, uBoil: uni.uBoil, uRot: { value: 0 }, uPxR: { value: 200 }, uAlpha: { value: 1 }, uBright: { value: 1 }, uCut: { value: 0 }, uCtr: { value: new T.Vector3() }, uRadV: { value: 1 }, uInside: { value: new T.Color(0.9, 0.6, 0.3) }, uInk: { value: 1 }, uCore: { value: new T.Color(...hex("#F1F2F7")) }, uCoreOn: { value: 0 } };
    this.starMat = new T.ShaderMaterial({ vertexShader: SPHERE_VERT, fragmentShader: STAR_FRAG, uniforms: su, side: T.DoubleSide });
    this.star = new T.Mesh(new T.SphereGeometry(1, 96, 64), this.starMat); this.star.name = "star_sphere"; this.star.renderOrder = 10; this.root.add(this.star);
    // cutaway layers (nested spheres, not to scale)
    this.layers = ONION.map(([name, col], i) => { const m = new T.Mesh(new T.SphereGeometry(1, 48, 32), new T.ShaderMaterial({ vertexShader: SPHERE_VERT, fragmentShader: LAYER_FRAG, side: T.DoubleSide,
      uniforms: { uCol: { value: new T.Color(...hex(col)) }, uAlpha: { value: 1 }, uCut: { value: 1 }, uCtr: su.uCtr, uGlow: { value: 0 }, uBoilT: uni.uBoilT, uBoil: uni.uBoil } })); m.name = "layer_" + name; m.renderOrder = 9; m.visible = false; this.root.add(m); return m; });
    // the 3D quill overlay (sl-quill.js): surface quills turn with the star; halo, rim and wind quills stand around it and do not.
    // All of it is stroke geometry rooted on the sphere: no camera-facing card anywhere (Dimitry, round 13)
    this.qSurf = quillMesh(T, buildQuillSurface(21), uni, 11); this.qSurf.name = "quill_surface"; this.qSurf.scale.setScalar(1.004); this.star.add(this.qSurf);
    this.qG = new T.Group(); this.qG.name = "quill_overlay"; this.root.add(this.qG);
    this.qHalo = quillMesh(T, buildQuillHalo(23), uni, 12); this.qHalo.name = "quill_halo";
    this.qRim = quillMesh(T, buildQuillRim(29), uni, 13); this.qRim.name = "quill_rim";
    this.qWind = quillMesh(T, buildQuillWind(31), uni, 12); this.qWind.name = "quill_wind"; this.qG.add(this.qHalo, this.qRim, this.qWind);
    // prominences: H-alpha tubes rooted in the surface (children of the star, so they turn with it)
    this.proms = new T.Group(); this.proms.name = "prominences"; this.star.add(this.proms);
    const promMat = new T.ShaderMaterial({ vertexShader: SPHERE_VERT, fragmentShader: PROM_FRAG, transparent: true, depthWrite: false, premultipliedAlpha: true, uniforms: { uAlpha: { value: 0.9 }, uT: { value: 0 }, uCtr: su.uCtr, uRadV: su.uRadV } });
    [[0.3, 0.2, 0.32], [2.2, -0.35, 0.16], [4.1, 0.55, 0.22]].forEach(([lon, lat, hgt]) => { const pts = []; for (let k = 0; k <= 16; k++) { const f = k / 16, a = lon + (f - 0.5) * 0.4, h = 1 + hgt * Math.sin(Math.PI * f); pts.push(new T.Vector3(Math.cos(lat) * Math.cos(a) * h, Math.sin(lat) * h + (f - 0.5) * 0.05, Math.cos(lat) * Math.sin(a) * h)); }
      const m = new T.Mesh(new T.TubeGeometry(new T.CatmullRomCurve3(pts), 32, 0.02, 8), promMat); this.proms.add(m); }); this.promMat = promMat;
    this.buildProtostar(); this.buildNebula(); this.buildRemnant(); this.buildPulsar(); this.buildLens(); this.buildEarth(); this.buildWinds(); this.buildOrbits();
    this.loadManifest();
    this.holders = { protostar: this.proto.g, planetary_nebula: this.neb.g, supernova_remnant: this.rem.g, pulsar_beams: this.pulsar.g };
    for (const name of Object.keys(MODEL_FILES)) loadModel(name, base).then((sc) => { if (sc) this.attachModel(name, sc); });
  }
  /** Drop in a sculpted GLB: each named node is attached at the placeholder node of the same name (so it follows that piece's
   *  size and fade), and the placeholder's own surface is hidden. Nodes are authored at unit radius about core_anchor. */
  attachModel(name, scene) {
    const holder = this.holders[name]; if (!holder) return 0; let n = 0;
    for (const node of MODEL_NODES[name]) { if (node === "core_anchor" || node === "spin_axis") continue; const src = scene.getObjectByName(node), dst = holder.getObjectByName(node); if (!src || !dst) continue;
      const c = src.clone(true); c.position.set(0, 0, 0); c.traverse((o) => { if (o.isMesh) { o.material = o.material.clone(); o.material.toneMapped = false; o.material.transparent = true; o.material.depthWrite = false; o.userData.sculpt = true; } });
      if (dst.material) dst.material.visible = false; dst.traverse((o) => { if (o !== dst && o.material && !o.userData.sculpt) o.material.visible = false; }); dst.add(c); n++; }
    holder.userData.sculpted = n > 0; return n;
  }
  placeholderTex() {
    const T = this.T; if (this.ph) return this.ph; const mk = (kind) => [0, 1, 2].map((v) => { const cv = typeof document !== "undefined" ? paintPlaceholder(kind, v) : null; const t = cv ? new T.CanvasTexture(cv) : new T.DataTexture(new Uint8Array([140, 140, 140, 255]), 1, 1); t.wrapS = T.RepeatWrapping; t.needsUpdate = true; return t; });
    this.ph = { fine: mk("fine"), coarse: mk("coarse"), smooth: mk("smooth") }; return this.ph;
  }
  phFor(name) { return name === "rsg" || name === "rg" ? this.ph.coarse : name === "zams15" ? this.ph.smooth : this.ph.fine; }
  async loadManifest() { try { const r = await fetch(new URL("tex/manifest.json", this.base).href); this.manifest = r.ok ? await r.json() : { textures: [] }; } catch (e) { this.manifest = { textures: [] }; } }
  /** Leo's bake for a star at a level, or the placeholder. Returns { tex: [3], mode } (mode 1: colour texture). */
  starTextures(name, lvl) {
    const have = this.manifest && this.manifest.textures || []; const full = (l) => [1, 2, 3].every((v) => have.includes(texName(name, v, l)));
    if (!full(lvl)) { const other = lvl === "2k" ? "1k" : "2k"; if (!full(other)) return { tex: this.phFor(name), mode: 0 }; lvl = other; }   // only one level baked so far: use it
    const key = name + lvl; if (!this.texCache[key]) { const T = this.T; const loader = new T.TextureLoader(); this.texCache[key] = [1, 2, 3].map((v) => { const t = loader.load(new URL("tex/" + texName(name, v, lvl), this.base).href); t.colorSpace = T.NoColorSpace; t.wrapS = T.RepeatWrapping; return t; }); }
    return { tex: this.texCache[key], mode: 1, mean: (this.manifest.means || {})[name] || null };
  }
  shellMat(c1, c2, { seed = 0, rim = 2.2, dark = 0, additive = true } = {}) {
    const T = this.T; return new T.ShaderMaterial({ vertexShader: SPHERE_VERT, fragmentShader: SHELL_FRAG, transparent: true, depthWrite: false, side: T.DoubleSide, premultipliedAlpha: true,
      blending: additive ? T.AdditiveBlending : T.NormalBlending, uniforms: { uCol: { value: new T.Color(...hex(c1)) }, uCol2: { value: new T.Color(...hex(c2)) }, uAlpha: { value: 1 }, uBoilT: this.uni.uBoilT, uBoil: this.uni.uBoil, uSeed: { value: seed }, uRim: { value: rim }, uDark: { value: dark } } });
  }
  jetMat(col) { const T = this.T; return new T.ShaderMaterial({ vertexShader: SPHERE_VERT, fragmentShader: JET_FRAG, transparent: true, depthWrite: false, blending: T.AdditiveBlending, side: T.DoubleSide, uniforms: { uCol: { value: new T.Color(...hex(col)) }, uAlpha: { value: 1 }, uT: { value: 0 }, uBoilT: this.uni.uBoilT, uBoil: this.uni.uBoil, uGain: { value: 0.8 } } }); }
  /** protostar.glb placeholder: cloud_shell (nested alpha shells), disk, jet_n, jet_s, core_anchor. */
  buildProtostar() {
    const T = this.T; const g = new T.Group(); g.name = "protostar"; const shell = new T.Group(); shell.name = "cloud_shell";
    [1, 0.82, 0.64].forEach((k, i) => { const m = new T.Mesh(new T.SphereGeometry(k, 48, 32), this.shellMat(i === 2 ? "#6A4E7A" : "#40325E", "#8A5A6A", { seed: i * 3.1, rim: 1.4, dark: 1, additive: false })); m.renderOrder = 4 + i; shell.add(m); });
    const disk = new T.Mesh(new T.RingGeometry(0.03, 1, 160, 8), new T.ShaderMaterial({ vertexShader: DISK_VERT, fragmentShader: DISK_FRAG, transparent: true, depthWrite: false, side: T.DoubleSide, premultipliedAlpha: true,
      uniforms: { uT: { value: 0 }, uIn: { value: 0.03 }, uAlpha: { value: 1 }, uBoilT: this.uni.uBoilT, uBoil: this.uni.uBoil, uC0: { value: new T.Color(...hex("#FFDCB8")) }, uC1: { value: new T.Color(...hex("#E9B98A")) }, uC2: { value: new T.Color(...hex("#C98E62")) }, uC3: { value: new T.Color(...hex("#8E5C46")) } } }));
    disk.name = "disk"; disk.rotation.x = -Math.PI / 2; disk.renderOrder = 8;
    const jg = new T.CylinderGeometry(0.1, 0.012, 1, 24, 8, true); jg.translate(0, 0.5, 0); const jm = this.jetMat("#FF7A8E");
    const jn = new T.Mesh(jg, jm); jn.name = "jet_n"; const js = new T.Mesh(jg, jm); js.name = "jet_s"; js.rotation.z = Math.PI; jn.renderOrder = js.renderOrder = 12;
    const anchor = new T.Object3D(); anchor.name = "core_anchor"; g.add(shell, disk, jn, js, anchor); this.root.add(g);
    this.proto = { g, shell, disk, jets: [jn, js], jetMat: jm };
  }
  /** planetary_nebula.glb placeholder: shell_inner ([O III] teal), shell_outer (H-alpha), halo. */
  buildNebula() { const T = this.T; const g = new T.Group(); g.name = "planetary_nebula";
    const inner = new T.Mesh(new T.SphereGeometry(0.62, 64, 40), this.shellMat("#4FD8C0", "#7FE8D2", { seed: 1.7, rim: 1.8 })); inner.name = "shell_inner"; inner.scale.set(1, 0.86, 1);
    const outer = new T.Mesh(new T.SphereGeometry(1, 64, 40), this.shellMat("#FF5A6A", "#FF7A8E", { seed: 4.2, rim: 2.6 })); outer.name = "shell_outer"; outer.scale.set(1.08, 0.9, 1);
    const halo = new T.Mesh(new T.SphereGeometry(1.5, 48, 32), this.shellMat("#8FA8FF", "#FF7A8E", { seed: 8.0, rim: 3.5 })); halo.name = "halo";
    const anchor = new T.Object3D(); anchor.name = "core_anchor"; [inner, outer, halo].forEach((m, i) => { m.renderOrder = 13 + i; }); g.add(inner, outer, halo, anchor); this.root.add(g); this.neb = { g, parts: [inner, outer, halo] }; }
  /** supernova_remnant.glb placeholder: filaments (wobbling strands on a torn shell) and shock_shell. */
  buildRemnant() { const T = this.T; const g = new T.Group(); g.name = "supernova_remnant";
    const shock = new T.Mesh(new T.SphereGeometry(1, 64, 40), this.shellMat("#8FA8FF", "#FF7A8E", { seed: 2.5, rim: 3.0 })); shock.name = "shock_shell";
    const pos = [], col = []; let s = 91; const R = () => { s = (s * 16807) % 2147483647; return s / 2147483647; };
    for (let f = 0; f < 140; f++) { let th = Math.acos(R() * 2 - 1), ph = R() * Math.PI * 2; const c = R() < 0.6 ? hex("#FF5A6A") : hex("#4FD8C0"); let prev = null;
      for (let k = 0; k < 10; k++) { th += (R() - 0.5) * 0.12; ph += 0.05 + (R() - 0.5) * 0.08; const r = 0.86 + R() * 0.16; const p = [r * Math.sin(th) * Math.cos(ph), r * Math.cos(th), r * Math.sin(th) * Math.sin(ph)]; if (prev) { pos.push(...prev, ...p); col.push(...c, ...c); } prev = p; } }
    const geo = new T.BufferGeometry(); geo.setAttribute("position", new T.Float32BufferAttribute(pos, 3)); geo.setAttribute("color", new T.Float32BufferAttribute(col, 3));
    const fil = new T.LineSegments(geo, new T.LineBasicMaterial({ vertexColors: true, transparent: true, opacity: 0.9, blending: T.AdditiveBlending, depthWrite: false })); fil.name = "filaments";
    const anchor = new T.Object3D(); anchor.name = "core_anchor"; shock.renderOrder = 14; fil.renderOrder = 15; g.add(shock, fil, anchor); this.root.add(g); this.rem = { g, shock, fil }; }
  /** pulsar_beams.glb placeholder: beam_n, beam_s, field_lines (dipole loops), spin_axis (an empty along +Y). The neutron star sphere is ours. */
  buildPulsar() { const T = this.T; const g = new T.Group(); g.name = "pulsar_beams"; const axis = new T.Object3D(); axis.name = "spin_axis";
    const bg = new T.CylinderGeometry(0.16, 0.01, 1, 24, 6, true); bg.translate(0, 0.5, 0); const bm = this.jetMat("#B8C8FF");
    bm.uniforms.uGain.value = 1.6; const bn = new T.Mesh(bg, bm); bn.name = "beam_n"; bn.scale.set(1, 5, 1); const bs = new T.Mesh(bg, bm); bs.name = "beam_s"; bs.scale.set(1, 5, 1); bs.rotation.z = Math.PI;
    const pts = []; for (const Lk of [2.2, 3.4, 5]) for (let az = 0; az < 6; az++) { const a = az * Math.PI / 3; let prev = null; for (let k = 4; k <= 56; k++) { const th = Math.PI * k / 60; const r = Lk * Math.sin(th) ** 2; if (r < 1) { prev = null; continue; } const p = [r * Math.sin(th) * Math.cos(a), r * Math.cos(th), r * Math.sin(th) * Math.sin(a)]; if (prev) pts.push(...prev, ...p); prev = p; } }
    const lg = new T.BufferGeometry(); lg.setAttribute("position", new T.Float32BufferAttribute(pts, 3)); const fl = new T.LineSegments(lg, new T.LineBasicMaterial({ color: 0x8FA8FF, transparent: true, opacity: 0.45, depthWrite: false })); fl.name = "field_lines";
    axis.add(bn, bs, fl); bn.renderOrder = bs.renderOrder = 16; const anchor = new T.Object3D(); anchor.name = "core_anchor"; g.add(axis, anchor); g.rotation.z = 0.35; this.root.add(g); this.pulsar = { g, axis, beamMat: bm }; }
  /** Black hole: a black sphere at the shadow radius (2.6 horizon radii, schematic) with a warm photon ring of rim quills and faint halo quills. */
  buildLens() { const T = this.T; const g = new T.Group(); g.name = "black_hole";
    const shadow = new T.Mesh(new T.SphereGeometry(1, 48, 32), new T.MeshBasicMaterial({ color: 0x000000 })); shadow.name = "shadow"; shadow.renderOrder = 10;
    const ring = quillMesh(T, buildQuillRim(37, 420, 1.0), this.uni, 14); ring.name = "photon_ring"; ring.scale.setScalar(1.01); ring.material.uniforms.uBase.value.setRGB(1.0, 0.86, 0.68);
    const glow = quillMesh(T, buildQuillHalo(41, 260), this.uni, 13); glow.name = "lensed_light"; glow.material.uniforms.uBase.value.setRGB(1.0, 0.86, 0.68); glow.material.uniforms.uLen.value = 0.6;
    g.add(shadow, ring, glow); this.root.add(g); this.lens = g; this.bh = { g, shadow, ring, glow }; }
  buildEarth() { const T = this.T; this.earth = new T.Mesh(new T.SphereGeometry(1, 48, 32), new T.ShaderMaterial({ vertexShader: SPHERE_VERT, fragmentShader: EARTH_FRAG, transparent: true, uniforms: { uSun: { value: new T.Vector3(-1, 0.2, 0.4) }, uPxR: { value: 40 }, uAlpha: { value: 1 } } })); this.earth.name = "earth"; this.root.add(this.earth); }
  buildWinds() { this.winds = this.qWind; }   // winds are quills now (sl-quill.js kind 3)
  buildOrbits() { const T = this.T; this.orbitObjs = {}; const pts = []; for (let i = 0; i <= 160; i++) { const a = i / 160 * Math.PI * 2; pts.push(new T.Vector3(Math.cos(a), 0, Math.sin(a))); }
    const geo = new T.BufferGeometry().setFromPoints(pts);
    for (const name of [...Object.keys(ORBIT_AU), "ring0", "ring1"]) { const line = new T.Line(geo, new T.LineDashedMaterial({ color: 0xAACDFF, dashSize: 0.04, gapSize: 0.035, transparent: true, opacity: 0.85, depthWrite: false })); line.computeLineDistances(); line.renderOrder = 19; line.visible = false; line.rotation.x = 0.28;
      const lab = this.scenes.label(name.startsWith("ring") ? "" : `${name}'s orbit`, { size: 0.04, plate: true }); lab.visible = false; this.root.add(line, lab); this.orbitObjs[name] = { line, lab }; }
    // planet orbits are named in at most two rows (inside the star, outside it), so labels can never pile up
    this.orbRows = [0, 1].map(() => { const lab = this.scenes.label("", { size: 0.04, plate: true }); lab.visible = false; this.root.add(lab); return lab; }); }

  /** Snap the dolly to the current hero (used once when a run starts from the masses screen). */
  reset() { this.fresh = true; }
  ease(key, target, dt, tau = 0.7) { const f = this.fade; if (f[key] == null || this.fresh) f[key] = target; else f[key] += (target - f[key]) * (1 - Math.exp(-dt / tau)); return f[key]; }
  kmPerUnit() { return Math.pow(10, this.cam.L) * RSUN_KM; }
  /** c: { v, st, dt, time, camLocal, camQuatLocal, ppu (px per world unit), calm, phone } */
  update(c) {
    const T = this.T; const v = c.v; if (!v || !v.stage) return; const dt = this.fresh ? 0 : Math.max(0, Math.min(0.1, c.dt || 0)); const look = lookFor(v, c.st && c.st.mass, c.st || {}); this.look = look;
    // the dolly
    // on a phone the strip is short: pull back a little more while orbit labels are up so they fit above the star
    const hero = look.hero * (c.phone && this.labRows ? 1 + 0.4 * this.labRows : 1);
    const target = bandTarget(this.fresh ? Math.log10(hero) - Math.log10(look.band === "wide" ? 0.45 : 0.38) : this.cam.L, hero, look.band);
    if (this.fresh) { this.cam.L = target; this.cam.v = 0; this.cam.vRef = 0; this.cam.lastT = target; } else dollyStep(this.cam, target, dt);
    const Rf = Math.pow(10, this.cam.L); const u = (rSun) => rSun / Rf; this.Rf = Rf;
    const q = c.camQuatLocal; const ppu = c.ppu || 300; const chips = [];
    // star
    const S = look.star; const aStar = this.ease("star", S.on ? S.a : 0, dt, 0.5); let R = S.R; let xr = u(R);
    if (S.kind === "ns" || look.ns.a > 0.01) { /* the neutron star is drawn below */ }
    const drawn = Math.max(xr, FRAME.minX); if (S.on && xr < FRAME.minX / 3 && aStar > 0.5) chips.push("The star is drawn bigger than scale here, so you can see where it is.");
    this.star.visible = aStar > 0.01; this.star.scale.setScalar(drawn);
    const sm = this.starMat.uniforms; const base = S.kind === "proto" && S.teff < 5000 ? hex("#FFDCB8") : srgb(S.teff); sm.uBase.value.setRGB(...base);
    const [limb, lk] = limbFor(S.teff); sm.uLimb.value.set(...limb); sm.uLimbK.value = lk; sm.uAlpha.value = aStar; this.starMat.transparent = aStar < 0.99; this.starMat.depthWrite = aStar >= 0.99;
    sm.uBright.value = S.bright; sm.uCoreOn.value = 0; sm.uCut.value = S.cut; sm.uInside.value.setRGB(...base.map((x) => x * 0.85)); sm.uAmp.value = S.kind === "wd" ? 0.15 : 0.55;
    sm.uRot.value = (c.time || 0) * (c.calm ? 0.004 : 0.006); const pxR = drawn * ppu; sm.uPxR.value = pxR; sm.uInk.value = pxR > 6 ? 1 : 0;
    const wB = this.uni.uBoil.value > 0.5; if (wB) { const bt = (this.uni.uBoilT.value || 0) * 8, f = Math.floor(bt), fr = bt - f; const w = [0, 0, 0]; w[f % 3] = 1 - fr; w[(f + 1) % 3] += fr; sm.uW.value.set(...w); } else sm.uW.value.set(1, 0, 0);
    // stroke texture by star type and on-screen size (strokes stay about the same size on screen)
    const tname = starTex(S.teff, R, v.stage.scene), lvl = pxR > 260 ? "2k" : "1k"; const want = tname + ":" + lvl;
    if (this.texSet.want !== want) { const nt = this.starTextures(tname, lvl); const st = this.texSet; st.A = st.mixDone ? st.B : st.A; st.B = { name: want, ...nt }; st.want = want; st.mix = this.fresh ? 1 : 0; st.mixDone = false; }
    { const st = this.texSet; st.mix = Math.min(1, st.mix + dt / 1.0); if (st.mix >= 1) st.mixDone = true; const A = st.A.tex || this.ph.fine, B = st.B.tex; sm.uA0.value = A[0]; sm.uA1.value = A[1]; sm.uA2.value = A[2]; sm.uB0.value = B[0]; sm.uB1.value = B[1]; sm.uB2.value = B[2]; sm.uMixB.value = st.mix; sm.uMode.value.set(st.A.mode || 0, st.B.mode || 0);
      // a colour bake keeps its painted detail but takes the model's surface colour: multiply by (star colour / bake average)
      const k = (set, u) => { if (!set.mean) { u.set(1, 1, 1); return; } u.set(...base.map((b, i) => Math.min(1.1, b / Math.max(0.05, set.mean[i])))); }; k(st.A, sm.uKA.value); k(st.B, sm.uKB.value); }
    this.star.updateMatrixWorld(); const ctr = new T.Vector3().setFromMatrixPosition(this.star.matrixWorld); if (c.viewMatrix) ctr.applyMatrix4(c.viewMatrix); sm.uCtr.value.copy(ctr); sm.uRadV.value = drawn * (c.worldScale || 1);
    // layers (cutaway)
    const Ly = S.layers; const fr = [0.62, 0.47, 0.36, 0.27, 0.2, 0.14, 0.09];
    this.layers.forEach((m, i) => { const on = S.on && S.cut > 0 && Ly && i < Ly.n; const a = this.ease("layer" + i, on ? 1 : 0, dt, 0.4); m.visible = a > 0.02 && this.star.visible; let k = fr[i] * (Ly && Ly.n === 2 ? (i === 0 ? 0.4 : 0.18) / fr[i] : 1);
      if (Ly && Ly.collapse && i === Ly.n - 1) k *= 1 - 0.85 * Ly.collapse; m.scale.setScalar(drawn * k); m.material.uniforms.uAlpha.value = 1; m.material.uniforms.uGlow.value = Ly && i === Ly.n - 1 ? Ly.flash : 0; });
    // quill overlay: surface quills on the near side, halo quills 1.05 to 1.2 R (longer only when the star is drawn bigger than scale), rim quills at the silhouette
    const compact = S.kind === "wd" || drawn > xr * 1.5; const hLen = compact ? (drawn > xr * 1.5 ? 2.5 : 0.4) : 1.0;
    const qa = aStar * Math.min(1, S.bright); const radV = drawn * (c.worldScale || 1);
    const qset = (m, a, len) => { const uq = m.material.uniforms; uq.uAlpha.value = a; uq.uCtr.value.copy(ctr); uq.uRadV.value = radV; uq.uT.value = c.time || 0; if (len != null) uq.uLen.value = len; m.visible = a > 0.01; };
    this.qG.position.copy(this.star.position); this.qG.scale.setScalar(drawn); this.qG.visible = this.star.visible;
    qset(this.qSurf, S.cut > 0.01 ? 0 : qa * 0.5); this.qSurf.material.uniforms.uBase.value.setRGB(...base); this.qSurf.rotation.y = sm.uRot.value * 6.2831853;
    qset(this.qHalo, qa * 0.9, hLen); this.qHalo.material.uniforms.uBase.value.setRGB(...base);
    qset(this.qRim, pxR > 6 ? qa : 0); this.qRim.material.uniforms.uBase.value.setRGB(...base);
    // prominences
    const ap = this.ease("proms", look.proms && S.on ? 1 : 0, dt); this.proms.visible = ap > 0.02 && this.star.visible; this.promMat.uniforms.uAlpha.value = 0.9 * ap; this.promMat.uniforms.uT.value = c.time || 0;
    // protostar pieces
    const ac = this.ease("cloud", look.cloud.a, dt, 0.8); this.proto.shell.visible = ac > 0.01; this.proto.shell.scale.setScalar(u(look.cloud.r)); this.proto.shell.children.forEach((m) => { m.material.uniforms.uAlpha.value = ac * (look.cloud.ir ? 0.35 : 0.8); });
    const ad = this.ease("disk", look.disk.a, dt, 0.8); this.proto.disk.visible = ad > 0.01; this.proto.disk.scale.setScalar(u(look.disk.r)); this.proto.disk.material.uniforms.uAlpha.value = ad; this.proto.disk.material.uniforms.uT.value = (c.flowT || 0) * 0.5; this.proto.disk.material.uniforms.uIn.value = clamp(u(R * 4) / Math.max(u(look.disk.r), 1e-9), 0.012, 0.2);
    const aj = this.ease("jets", look.jets.a, dt, 0.8); this.proto.jets.forEach((j) => { j.visible = aj > 0.01; j.scale.set(u(look.disk.r) * 0.6, u(look.disk.r) * 1.2, u(look.disk.r) * 0.6); }); this.proto.jetMat.uniforms.uAlpha.value = aj; this.proto.jetMat.uniforms.uT.value = c.time || 0;
    // nebula
    const an = this.ease("neb", look.nebula.a, dt, 0.8); this.neb.g.visible = an > 0.01; this.neb.g.scale.setScalar(u(look.nebula.r)); this.neb.parts.forEach((m, i) => { m.material.uniforms.uAlpha.value = an * [0.8, 0.9, 0.25][i]; });
    // supernova remnant (a ghost for the 40 Sun "explode first" path)
    const as = this.ease("sn", look.sn.a, dt, 0.5); this.rem.g.visible = as > 0.01; this.rem.g.scale.setScalar(u(look.sn.r)); this.rem.shock.material.uniforms.uAlpha.value = as * (look.sn.ghost ? 0.5 : 0.7); this.rem.fil.material.opacity = as * (look.sn.ghost ? 0.35 : 0.9);
    // neutron star (12 km sphere, NS colour #95B1FF with a white-hot core) and its beams
    const ans = this.ease("ns", look.ns.a, dt, 0.5); this.pulsar.g.visible = ans > 0.01 && look.ns.beams > 0; const nsR = Math.max(u(SIZES.ns), FRAME.minX);
    this.pulsar.g.scale.setScalar(nsR); this.pulsar.axis.rotation.y = (c.time || 0) * (c.calm ? 0.6 : 2.4); this.pulsar.beamMat.uniforms.uAlpha.value = ans; this.pulsar.beamMat.uniforms.uT.value = c.time || 0;
    if (ans > 0.01 && aStar < 0.05) { this.star.visible = true; this.star.scale.setScalar(nsR); sm.uBase.value.setRGB(...hex("#95B1FF")); sm.uLimb.value.set(1, 1, 1); sm.uLimbK.value = 1; sm.uCoreOn.value = 1; sm.uAlpha.value = ans; this.starMat.transparent = ans < 0.99; sm.uAmp.value = 0.2; sm.uCut.value = 0;
      sm.uPxR.value = nsR * ppu; sm.uInk.value = 1; sm.uBright.value = 1.35; this.qG.visible = true; this.qG.scale.setScalar(nsR); const nsC = hex("#95B1FF"); const radN = nsR * (c.worldScale || 1);
      for (const [m, a, len] of [[this.qHalo, ans * 0.8, 0.35], [this.qRim, ans, null], [this.qSurf, ans * 0.4, null]]) { const uq = m.material.uniforms; uq.uAlpha.value = a; uq.uCtr.value.copy(ctr); uq.uRadV.value = radN; uq.uBase.value.setRGB(...nsC); if (len != null) uq.uLen.value = len; m.visible = true; } }
    if (ans > 0.01 && u(SIZES.ns) < FRAME.minX / 3) chips.push("The neutron star is drawn bigger than scale here. It is only about 24 km across.");
    // black hole lens
    const ab = this.ease("bh", look.bh.a, dt, 0.6); this.lens.visible = ab > 0.01; const rsU = Math.max(u(look.bh.rs), FRAME.minX / 2.6); this.lens.scale.setScalar(rsU * 2.6);
    if (this.lens.visible) { this.lens.updateMatrixWorld(); const bc = new T.Vector3().setFromMatrixPosition(this.lens.matrixWorld); if (c.viewMatrix) bc.applyMatrix4(c.viewMatrix); const br = rsU * 2.6 * (c.worldScale || 1);
      for (const m of [this.bh.ring, this.bh.glow]) { const uq = m.material.uniforms; uq.uAlpha.value = ab * (m === this.bh.glow ? 0.55 : 1); uq.uCtr.value.copy(bc); uq.uRadV.value = br * (m === this.bh.ring ? 1.01 : 1); uq.uT.value = c.time || 0; } this.bh.shadow.material.transparent = ab < 0.99; this.bh.shadow.material.opacity = ab; }
    // Earth beside the white dwarf, same scale
    const ae = this.ease("earth", look.earth.a, dt, 0.6); this.earth.visible = ae > 0.01; this.earth.scale.setScalar(u(SIZES.earth)); this.earth.position.set(xr * 2.4 + u(SIZES.earth) * 1.2, 0, 0); this.earth.material.uniforms.uAlpha.value = ae; this.earth.material.uniforms.uPxR.value = u(SIZES.earth) * ppu; this.earth.material.transparent = ae < 0.99;
    // winds
    const aw = this.ease("winds", look.winds.a, dt); { const uq = this.qWind.material.uniforms; this.qWind.visible = aw > 0.01 && this.star.visible; uq.uAlpha.value = aw * qa; uq.uT.value = c.flowT || 0; uq.uBase.value.setRGB(...base); uq.uCtr.value.copy(ctr); uq.uRadV.value = radV; uq.uLen.value = 1; }
    // orbit rings (same scale) and comparison rings
    const want2 = {}; const labs = []; const inside = [], outside = []; for (const o of look.orbits) want2[o.name] = o.r; look.rings.forEach((r, i) => { want2["ring" + i] = r.r; });
    for (const [name, o] of Object.entries(this.orbitObjs)) { const r = want2[name]; const a = this.ease("orb" + name, r != null && u(r) < 4 && u(r) > 0.04 ? 1 : 0, dt, 0.5); o.line.visible = a > 0.02; if (r != null) { o.r = r; } const rr = u(o.r || 1); o.line.scale.setScalar(rr); o.line.material.opacity = 0.85 * a; o.line.material.dashSize = 0.04 / Math.max(rr, 1e-6) * 0.6; o.line.material.gapSize = 0.03 / Math.max(rr, 1e-6) * 0.6;
      const ringLab = name.startsWith("ring") ? (look.rings[+name.slice(4)] || {}).label : null; if (ringLab) this.scenes.setLabel(o.lab, ringLab);
      const show = o.line.visible && a > 0.5; if (!name.startsWith("ring")) { o.lab.visible = false; if (show) (rr < drawn ? inside : outside).push(name); continue; }
      o.lab.visible = show; if (show) labs.push({ o, rr }); }
    const names = (L) => { const n = L.map((x) => `${x}'s`); return (n.length > 1 ? n.slice(0, -1).join(", ") + " and " + n[n.length - 1] : n[0]) + (L.length > 1 ? " orbits" : " orbit"); };
    [[inside, (L) => `Inside the star: ${names(L)}`], [outside, names]].forEach(([L, txt], k) => { const lab = this.orbRows[k]; lab.visible = L.length > 0; if (lab.visible) { this.scenes.setLabel(lab, txt(L)); labs.push({ o: { lab }, rr: k === 0 ? -1 : drawn * 1.3 }); } });
    // labels stack above the star, never on it or their ring, one row each, so they never stack on each other
    labs.sort((p, q2) => p.rr - q2.rr).forEach(({ o, rr }, i) => { o.lab.quaternion.copy(q); o.lab.position.copy(new T.Vector3(0, Math.max(drawn * 1.06, Math.min(rr, drawn * 1.3)) + 0.06 + i * 0.1, 0).applyQuaternion(q)); }); this.labRows = labs.length;
    // sculpted GLB pieces fade with the placeholder they replace
    const fades = { protostar: Math.max(ac, ad, aj), planetary_nebula: an, supernova_remnant: as, pulsar_beams: ans };
    for (const [k, h] of Object.entries(this.holders)) if (h.userData.sculpted) h.traverse((o) => { if (o.userData.sculpt) o.material.opacity = fades[k]; });
    // pieces far outside the view (or far too small to see) are hidden, so nothing huge sits past the far plane
    for (const o of [this.proto.shell, this.proto.disk, this.neb.g, this.rem.g]) { const k = o.scale.x; if (k > 400 || k < 1e-4) o.visible = false; }
    for (const j of this.proto.jets) if (j.scale.y > 400 || j.scale.y < 1e-4) j.visible = false;
    this.radius = clamp(u(look.hero), 0.2, 1); this.barAt = [0, -Math.min(Math.max(drawn * 1.15, look.band === "wide" ? 0.45 : 0) + 0.06, 0.44)]; this.barMax = 0.3;   // the bar always sits inside the scene region, so it never goes under a card
    this.chips = chips; this.strokes = 0; this.fresh = false;
  }
}
