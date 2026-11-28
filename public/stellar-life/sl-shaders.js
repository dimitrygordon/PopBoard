// Stellar Life Cycle VR: painted-stroke shaders (style B, LOOK-SPEC v2 section 5).
// Ported from the painted-stroke tech test (branch test/painted-strokes, af0d9fd) that ran at 90 fps on Quest 3:
// unlit ribbons with feathered edges, stepped line boil (8 steps per second over a 32 step loop), slow flow,
// fake bloom sprites, and Tesla's colour rule: overflow is bled equally into R, G and B and renormalised, never clamped per channel.
// New here: a STAR mode that colours strokes from a temperatureToSRGB lookup at the live Teff (so the hue always comes
// from Night Sky's function), limb darkening on a stroked sphere, radial wind drift and inward collapse flow.
const HASH = /* glsl */`
float h11(float p){ p = fract(p * .1031); p *= p + 33.33; p *= p + p; return fract(p); }
float h21(vec2 p){ vec3 p3 = fract(vec3(p.xyx) * .1031); p3 += dot(p3, p3.yzx + 33.33); return fract((p3.x + p3.y) * p3.z); }
`;
// sRGB transfer, IEC 61966-2-1 (same curve as temperatureToSRGB's encoder)
const SRGB = /* glsl */`
vec3 dec(vec3 c){ return mix(c / 12.92, pow((c + 0.055) / 1.055, vec3(2.4)), step(0.04045, c)); }
vec3 enc(vec3 c){ c = max(c, 0.0); return mix(c * 12.92, 1.055 * pow(c, vec3(1.0 / 2.4)) - 0.055, step(0.0031308, c)); }
// Tesla's rule: if the brightest channel passes 1, bleed the overflow equally into all channels, then renormalise.
vec3 bleed(vec3 c){ float m = max(c.r, max(c.g, c.b)); if (m > 1.0) { float w = 0.9 * (m - 1.0); c = (c / m + vec3(w)) / (1.0 + w); } return c; }
`;
// temperatureToSRGB lookup: 512 texels over log10(T) = 3.0 to 6.0, stored sRGB encoded (brightest channel 1)
const LUT = /* glsl */`
uniform sampler2D uLut;
vec3 tlin(float T){ float u = clamp((log(max(T, 1000.0)) / 2.302585 - 3.0) / 3.0, 0.0, 1.0); return dec(texture2D(uLut, vec2(u * (511.0 / 512.0) + 0.5 / 512.0, 0.5)).rgb); }
`;
export const strokeVert = /* glsl */`
attribute vec3 aTan; attribute vec3 aUvK; attribute vec4 aA; attribute vec4 aColor; attribute vec4 aParam;
uniform float uFlowT; uniform float uBoilT; uniform float uBoil; uniform float uBoilGain; uniform vec3 uCamLocal; uniform float uCosElev;
uniform float uAlpha; uniform float uWind; uniform float uWindLen; uniform float uPull; uniform float uLayerA[7]; uniform float uCrisp; uniform float uGrow;
#ifdef STAR
uniform float uTeff; uniform float uExposure; uniform vec3 uPeek; uniform float uPeekOn;
#endif
varying vec4 vColor; varying vec4 vUV;
${HASH}
${SRGB}
#ifdef STAR
${LUT}
#endif
vec3 rotY(vec3 v, float a){ float c = cos(a), s = sin(a); return vec3(c * v.x + s * v.z, v.y, -s * v.x + c * v.z); }
void main(){
  float side = aA.x, seed = aA.w; float width = aA.y; float kind = aUvK.z;
  const float TAU = 6.2831853;
  float tl = uFlowT / 4.0;
  vec3 p = position; vec3 tn = aTan;
  float r = length(position.xz) + 1e-3; float dth = 0.0, fade = 1.0;
  bool flatK = kind > 5.5 && kind < 6.5;   // FLAT: lies in the disk plane (Angelo's v4 ribbons face the disk normal)
  if ((kind > 0.5 && kind < 2.5) || flatK) dth = (7.0 / 32.0) / r * sin(TAU * tl - 1.05 * r);
  if (kind > 2.5 && kind < 3.5) { float su = fract(tl + aParam.x); dth = (44.0 / 32.0) / r * su; fade = 0.55 * pow(max(sin(3.14159265 * su), 0.0), 1.5); }
  p = rotY(p, dth); tn = rotY(tn, dth);
#ifdef GROW
  // flare arcade: a rib with birth b (aParam.x) appears at uGrow = 0.85 b and rises from its feet (ease-out)
  float gr = clamp((uGrow - aParam.x * 0.85) / 0.15, 0.0, 1.0); p.y *= 1.0 - (1.0 - gr) * (1.0 - gr);
#endif
  if (kind > 3.5 && kind < 4.5) { float su = fract(tl * 0.5 + aParam.x); p += normalize(position) * su * uWindLen; fade = uWind * pow(max(sin(3.14159265 * su), 0.0), 1.2); }   // wind: gas streams off
  if (kind > 4.5 && kind < 5.5) { float su = fract(tl * 0.5 + aParam.x); p *= 1.0 - 0.75 * su * uPull; fade = pow(max(sin(3.14159265 * su), 0.0), 1.2); }       // collapse: filaments stream inward
  vec2 dxz = normalize(p.xz + vec2(1e-4)); vec2 cxz = normalize(uCamLocal.xz + vec2(1e-4));
  float nearK = smoothstep(-0.15, 0.5, dot(dxz, cxz)) * uCosElev;
  vec3 col = aColor.rgb; float al = aColor.a * fade * uAlpha;
  int li = int(aParam.w + 0.5); if (li > 0) { float la = 0.0; for (int k = 0; k < 7; k++) { if (k == li - 1) la = uLayerA[k]; } al *= la; }   // core cutaway layers
  if (kind > 1.5 && kind < 2.5) { al *= smoothstep(0.0, 0.4, dot(dxz, cxz)) * uCosElev; }
  if (kind > 2.5 && kind < 3.5) { al *= mix(1.0, 0.5, nearK); }
  vec4 vp = modelViewMatrix * vec4(p, 1.0);
  float sc = length(modelViewMatrix[0].xyz);
#ifdef GROW
  al *= min(1.0, gr * 3.0);
#endif
  // crisp limb (style B v2.3: no feather or fringe strokes on compact stars): strokes fade before the limb and thin toward it,
  // so the painted surface sits inside the glow shader's crisp disc edge
  vec3 nrmC = normalize(mat3(modelViewMatrix) * normalize(position)); float muC = dot(nrmC, -normalize(vp.xyz));
  al *= mix(1.0, smoothstep(0.28, 0.55, muC), uCrisp); width *= mix(1.0, mix(0.25, 1.0, smoothstep(0.1, 0.7, muC)), uCrisp);
#ifdef STAR
  // colour = temperatureToSRGB(Teff + dT) in linear light x brightness k x limb darkening, then the equal bleed. Never a channel clamp.
  vec3 nrm = normalize(mat3(modelViewMatrix) * normalize(position)); float mu = dot(nrm, -normalize(vp.xyz));
  vec3 lin = tlin(uTeff + aColor.g * 1000.0 - 500.0);
  lin = mix(lin, dec(uPeek), uPeekOn);
  float mu1 = clamp(mu, 0.0, 1.0); float ld = 1.0 - 0.47 * (1.0 - mu1) - 0.13 * (1.0 - mu1) * (1.0 - mu1);
  col = enc(bleed(lin * aColor.r * ld * uExposure));
  al *= (kind > 3.5 && kind < 4.5) ? smoothstep(-0.7, -0.05, mu) : smoothstep(-0.02, 0.12, mu);   // outflow shells show at the limb
#endif
  vec3 tv = normalize(mat3(modelViewMatrix) * tn);
  vec3 sd = cross(tv, normalize(vp.xyz)); float sl = length(sd); sd = sl > 1e-4 ? sd / sl : vec3(1.0, 0.0, 0.0);
  if (flatK) { vec3 fs = mat3(modelViewMatrix) * cross(tn, vec3(0.0, 1.0, 0.0)); float fl = length(fs); if (fl > 1e-6) sd = fs / fl; }
  float u = mod(floor(uBoilT * 8.0), 32.0) / 32.0;
  float A = uBoil * aParam.y;
  vec4 hs = vec4(h21(vec2(seed, 1.0)), h21(vec2(seed, 2.0)), h21(vec2(seed, 3.0)), h21(vec2(seed, 4.0)));
  vec2 off = A * vec2(sin(TAU * (u * (1.0 + floor(hs.x * 3.0)) + hs.z)), sin(TAU * (u * (1.0 + floor(hs.y * 3.0)) + hs.w)));
  float cp = floor(aUvK.y * 8.0 + 0.5) * 1.37 + seed;
  vec4 hv = vec4(h21(vec2(cp, 5.0)), h21(vec2(cp, 6.0)), h21(vec2(cp, 7.0)), h21(vec2(cp, 8.0)));
  off += 0.5 * A * vec2(sin(TAU * (u * (1.0 + floor(hv.x * 3.0)) + hv.z)), sin(TAU * (u * (1.0 + floor(hv.y * 3.0)) + hv.w)));
  if (A > 0.0) width *= 1.0 + 0.07 * sin(TAU * (u * (1.0 + floor(hs.z * 3.0)) + hs.x));
  vp.xy += off * uBoilGain * sc;
  vp.xyz += sd * side * width * 0.5 * sc;
  gl_Position = projectionMatrix * vp;
  vColor = vec4(col, al); vUV = vec4(aUvK.x, aUvK.y, seed, aParam.z);
}`;
export const strokeFrag = /* glsl */`
precision highp float;
varying vec4 vColor; varying vec4 vUV;
${HASH}
float vn(vec2 p){ vec2 i = floor(p), f = fract(p); f = f * f * (3.0 - 2.0 * f); return mix(mix(h21(i), h21(i + vec2(1, 0)), f.x), mix(h21(i + vec2(0, 1)), h21(i + vec2(1, 1)), f.x), f.y); }
void main(){
  float u = vUV.x, v = vUV.y, seed = vUV.z, nb = vUV.w;
  float a = vColor.a; vec3 col = vColor.rgb;
  float edge = smoothstep(0.0, 0.28, u) * smoothstep(0.0, 0.28, 1.0 - u);
  if (nb > 1.5) {
    float bi = floor(u * nb), bu = fract(u * nb); float hb = h21(vec2(bi, seed));
    float streak = mix(0.55, 1.0, hb) * (0.75 + 0.5 * vn(vec2(bi * 7.3 + seed, v * 7.0)));
    float split = mix(1.0, smoothstep(0.0, 0.2, bu) * smoothstep(0.0, 0.2, 1.0 - bu), 0.4);
    float s0 = h21(vec2(bi + 3.0, seed)) * 0.12, e0 = 1.0 - h21(vec2(bi + 9.0, seed)) * 0.15;
    float trim = smoothstep(s0, s0 + 0.05, v) * smoothstep(e0, e0 - 0.05, v);
    a *= streak * split * trim;
#ifndef STAR
    col *= 1.0 + (hb - 0.5) * 0.08;
#endif
  }
  a *= edge;
  if (a < 0.002) discard;
  #ifdef ADDITIVE
  gl_FragColor = vec4(col * a, 1.0);
  #else
  gl_FragColor = vec4(col * a, a);
  #endif
}`;
export const spriteVert = /* glsl */`
attribute vec2 aCorner; attribute vec4 aColor; attribute vec2 aSz; uniform float uBreathT; uniform float uBreath; uniform float uAlpha;
varying vec2 vC; varying vec4 vColor;
void main(){
  float ph = sin(6.2831853 * uBreathT / 4.0);
  float br = 1.0 + aSz.y * uBreath * 0.03 * ph;
  vec4 vp = modelViewMatrix * vec4(position, 1.0); float sc = length(modelViewMatrix[0].xyz);
  vp.xy += aCorner * aSz.x * br * sc; gl_Position = projectionMatrix * vp; vC = aCorner;
  vColor = vec4(aColor.rgb, aColor.a * uAlpha * (1.0 + aSz.y * uBreath * 0.06 * ph));
}`;
export const spriteFrag = /* glsl */`
precision highp float; varying vec2 vC; varying vec4 vColor;
void main(){ float d = length(vC); if (d >= 1.0) discard; gl_FragColor = vec4(vColor.rgb * vColor.a * (1.0 - d), 1.0); }`;

export const bgVert = /* glsl */`varying vec3 vP; void main(){ vP = position; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }`;
export const bgFrag = /* glsl */`precision highp float; varying vec3 vP;
void main(){ vec3 d = normalize(vP); float az = atan(d.z, d.x);   // style B: navy above, a violet wash below the eye line
  float t = clamp(0.42 - 1.05 * d.y + 0.12 * sin(az + 0.6), 0.0, 1.0);
  vec3 a = vec3(0.0157, 0.0314, 0.1020), b = vec3(0.0471, 0.0784, 0.2275), c = vec3(0.1804, 0.1176, 0.3608);
  vec3 col = t < 0.5 ? mix(a, b, t / 0.5) : mix(b, c, (t - 0.5) / 0.5); gl_FragColor = vec4(col, 1.0); }`;

// Billboard glow / star disc. One fragment shader sums every layer, bleeds the overflow equally and draws premultiplied "over"
// (alpha = brightest channel), so a saturated core replaces what is under it instead of clipping per channel in the blend unit.
// uDisc > 0: a limb-darkened disc of radius uDisc (in the same units as uRad) in temperatureToSRGB(uTeff) linear light.
export const glowVert = /* glsl */`
uniform float uBreathT; uniform float uBreath; uniform float uMaxR; varying vec2 vC; varying float vBr;
void main(){
  float ph = sin(6.2831853 * uBreathT / 4.0); vBr = ph * uBreath;
  vec4 vp = modelViewMatrix * vec4(0.0, 0.0, 0.0, 1.0); float sc = length(modelViewMatrix[0].xyz);
  vec2 cn = position.xy; vp.xy += cn * uMaxR * (1.0 + 0.03 * vBr) * sc; gl_Position = projectionMatrix * vp; vC = cn;
}`;
export const glowFrag = /* glsl */`
precision highp float; varying vec2 vC; varying float vBr;
uniform vec4 uLay[5]; uniform float uRad[5]; uniform float uMaxR; uniform float uTeff; uniform float uDisc; uniform float uExposure; uniform float uAlpha;
uniform vec3 uPeek; uniform float uPeekOn; uniform float uUseTeff;
${SRGB}
${LUT}
void main(){
  float d = length(vC) * uMaxR / (1.0 + 0.03 * vBr); vec3 c = vec3(0.0);
  vec3 tint = mix(tlin(uTeff), dec(uPeek), uPeekOn);
  for (int i = 0; i < 5; i++) {
    float u = clamp(1.0 - d / uRad[i], 0.0, 1.0); float f = pow(u, 0.7);
    vec3 lc = uUseTeff > 0.5 ? tint : dec(uLay[i].rgb);
    c += lc * uLay[i].a * (1.0 + 0.06 * vBr) * f;
  }
  float a = 0.0;
  if (uDisc > 0.0 && d < uDisc) {
    float mu = sqrt(max(0.0, 1.0 - (d / uDisc) * (d / uDisc))); float om = 1.0 - mu;
    // grey limb darkening (G coefficients of LOOK-SPEC 3.2) so every disc pixel is temperatureToSRGB(Teff) x a scalar: the hue never moves
    float ld = 1.0 - 0.47 * om - 0.13 * om * om;
    vec3 disc = tint * ld * uExposure;
    float edge = smoothstep(uDisc, uDisc * 0.985, d);
    c = mix(c, disc + c * 0.15, edge); a = edge;
  }
  c = bleed(c);
  float m = max(c.r, max(c.g, c.b)); if (m < 1e-4 && a < 0.01) discard;
  a = max(a, clamp(m, 0.0, 1.0)) * uAlpha;
  gl_FragColor = vec4(enc(c) * a, a);
}`;
