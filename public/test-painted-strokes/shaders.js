// THROWAWAY tech test. Unlit, premultiplied stroke shader with stepped line boil and slow flow in the vertex stage.
const HASH = /* glsl */`
float h11(float p){ p = fract(p * .1031); p *= p + 33.33; p *= p + p; return fract(p); }
float h21(vec2 p){ vec3 p3 = fract(vec3(p.xyx) * .1031); p3 += dot(p3, p3.yzx + 33.33); return fract((p3.x + p3.y) * p3.z); }
`;
export const strokeVert = /* glsl */`
attribute vec3 aTan; attribute vec3 aUvK; attribute vec4 aA; attribute vec4 aColor; attribute vec4 aParam;
uniform float uFlowT; uniform float uBoilT; uniform float uBoil; uniform float uBoilGain; uniform vec3 uCamLocal; uniform float uCosElev;
varying vec4 vColor; varying vec4 vUV;
${HASH}
vec3 rotY(vec3 v, float a){ float c = cos(a), s = sin(a); return vec3(c * v.x + s * v.z, v.y, -s * v.x + c * v.z); }
void main(){
  float side = aA.x, seed = aA.w, nomW = aA.z; float width = aA.y; float kind = aUvK.z;
  const float TAU = 6.2831853;
  float tl = uFlowT / 4.0;                                // flow clock: one loop every 4 s (LOOK-SPEC v2 5.1)
  vec3 p = position; vec3 tn = aTan;
  float r = length(position.xz) + 1e-3; float dth = 0.0, fade = 1.0;
  if (kind > 0.5 && kind < 2.5) dth = (7.0 / 32.0) / r * sin(TAU * tl - 1.05 * r);   // shear wave: rings slide back and forth, phase travels outward
  float su = 0.0;
  if (kind > 2.5) { su = fract(tl + aParam.x); dth = (44.0 / 32.0) / r * su; fade = 0.55 * pow(max(sin(3.14159265 * su), 0.0), 1.5); }   // orbital streak: born, slides, fades
  p = rotY(p, dth); tn = rotY(tn, dth);
  vec2 dxz = normalize(p.xz + vec2(1e-4)); vec2 cxz = normalize(uCamLocal.xz + vec2(1e-4));
  float nearK = smoothstep(-0.15, 0.5, dot(dxz, cxz)) * uCosElev;     // 1 on the side facing the viewer
  vec3 col = aColor.rgb; float al = aColor.a * fade;
  if (kind > 0.5 && kind < 1.5) { col = mix(col, vec3(0.2275, 0.1647, 0.2902), aParam.w * 0.4 * nearK); al *= mix(1.0, 0.85, nearK); }
  if (kind > 1.5 && kind < 2.5) { al *= smoothstep(0.0, 0.4, dot(dxz, cxz)) * uCosElev; }
  if (kind > 2.5) { al *= mix(1.0, 0.5, nearK); }
  vec4 vp = modelViewMatrix * vec4(p, 1.0);
  float sc = length(modelViewMatrix[0].xyz);             // group scale (XR places the scene at human size)
  vec3 tv = normalize(mat3(modelViewMatrix) * tn);
  vec3 sd = cross(tv, normalize(vp.xyz)); float sl = length(sd); sd = sl > 1e-4 ? sd / sl : vec3(1.0, 0.0, 0.0);
  // stepped line boil: 8 steps per second over a 32-step loop. Each stroke is offset by A sin(2 pi (u k + phase)) in x and y,
  // each control point also wobbles by 0.5 A with its own phase, and the width pulses +/-7%.
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
varying vec4 vColor; varying vec4 vUV; varying vec2 vSB;
${HASH}
float vn(vec2 p){ vec2 i = floor(p), f = fract(p); f = f * f * (3.0 - 2.0 * f); return mix(mix(h21(i), h21(i + vec2(1, 0)), f.x), mix(h21(i + vec2(0, 1)), h21(i + vec2(1, 1)), f.x), f.y); }
void main(){
  float u = vUV.x, v = vUV.y, seed = vUV.z, nb = vUV.w;
  float a = vColor.a; vec3 col = vColor.rgb;
  float edge = smoothstep(0.0, 0.28, u) * smoothstep(0.0, 0.28, 1.0 - u);   // feathered edges from UV.x
  if (nb > 1.5) {                                                           // bristle streaks (cheap noise)
    float bi = floor(u * nb), bu = fract(u * nb); float hb = h21(vec2(bi, seed));
    float streak = mix(0.55, 1.0, hb) * (0.75 + 0.5 * vn(vec2(bi * 7.3 + seed, v * 7.0)));
    float split = mix(1.0, smoothstep(0.0, 0.2, bu) * smoothstep(0.0, 0.2, 1.0 - bu), 0.4);
    float s0 = h21(vec2(bi + 3.0, seed)) * 0.12, e0 = 1.0 - h21(vec2(bi + 9.0, seed)) * 0.15;    // bristles stop and start at different places
    float trim = smoothstep(s0, s0 + 0.05, v) * smoothstep(e0, e0 - 0.05, v);
    a *= streak * split * trim; col *= 1.0 + (hb - 0.5) * 0.08;
  }
  a *= edge;
  #ifdef ADDITIVE
  gl_FragColor = vec4(col * a, 1.0);
  #else
  gl_FragColor = vec4(col * a, a);
  #endif
}`;
export const spriteVert = /* glsl */`
attribute vec2 aCorner; attribute vec4 aColor; attribute vec2 aSz; uniform float uBreathT; uniform float uBreath;
varying vec2 vC; varying vec4 vColor;
void main(){
  float ph = sin(6.2831853 * uBreathT / 4.0);                 // one breath per 4 s loop: +/-3% radius, +/-6% alpha
  float br = 1.0 + aSz.y * uBreath * 0.03 * ph;
  vec4 vp = modelViewMatrix * vec4(position, 1.0); float sc = length(modelViewMatrix[0].xyz);
  vp.xy += aCorner * aSz.x * br * sc; gl_Position = projectionMatrix * vp; vC = aCorner;
  vColor = vec4(aColor.rgb, aColor.a * (1.0 + aSz.y * uBreath * 0.06 * ph));
}`;
export const spriteFrag = /* glsl */`
precision highp float; varying vec2 vC; varying vec4 vColor;
void main(){ float d = length(vC); if (d >= 1.0) discard; gl_FragColor = vec4(vColor.rgb * vColor.a * (1.0 - d), 1.0); }`;

// static painted-night backdrop: navy to violet gradient, same stops as the style B frame (#04081A, #0C143A, #2E1E5C)
export const bgVert = /* glsl */`varying vec3 vP; void main(){ vP = position; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }`;
export const bgFrag = /* glsl */`precision highp float; varying vec3 vP;
void main(){ vec3 d = normalize(vP); float t = clamp(0.75 * (0.5 - 0.5 * d.y) + 0.25 * (atan(d.z, d.x) / 3.14159265 * 0.5 + 0.5), 0.0, 1.0);
  vec3 a = vec3(0.0157, 0.0314, 0.1020), b = vec3(0.0471, 0.0784, 0.2275), c = vec3(0.1804, 0.1176, 0.3608);
  vec3 col = t < 0.6 ? mix(a, b, t / 0.6) : mix(b, c, (t - 0.6) / 0.4); gl_FragColor = vec4(col, 1.0); }`;
