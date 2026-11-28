// Stellar Life Cycle VR: painted-stroke shaders (style B, LOOK-SPEC v2 section 5).
// Ported from the painted-stroke tech test (branch test/painted-strokes, af0d9fd) that ran at 90 fps on Quest 3:
// unlit ribbons with feathered edges, stepped line boil (8 steps per second over a 32 step loop), slow flow,
// fake bloom sprites, and Tesla's colour rule: overflow is bled equally into R, G and B and renormalised, never clamped per channel.
// New here: a STAR mode that colours strokes from a temperatureToSRGB lookup at the live Teff (so the hue always comes
// from Night Sky's function), limb darkening on a stroked sphere, radial wind drift and inward collapse flow.
export const HASH = /* glsl */`
float h11(float p){ p = fract(p * .1031); p *= p + 33.33; p *= p + p; return fract(p); }
float h21(vec2 p){ vec3 p3 = fract(vec3(p.xyx) * .1031); p3 += dot(p3, p3.yzx + 33.33); return fract((p3.x + p3.y) * p3.z); }
float vn(vec2 p){ vec2 i = floor(p), f = fract(p); f = f * f * (3.0 - 2.0 * f); return mix(mix(h21(i), h21(i + vec2(1, 0)), f.x), mix(h21(i + vec2(0, 1)), h21(i + vec2(1, 1)), f.x), f.y); }
`;
// sRGB transfer, IEC 61966-2-1 (same curve as temperatureToSRGB's encoder)
const SRGB = /* glsl */`
vec3 dec(vec3 c){ return mix(c / 12.92, pow((c + 0.055) / 1.055, vec3(2.4)), step(0.04045, c)); }
vec3 enc(vec3 c){ c = max(c, 0.0); return mix(c * 12.92, 1.055 * pow(c, vec3(1.0 / 2.4)) - 0.055, step(0.0031308, c)); }
// Tesla's rule: if the brightest channel passes 1, bleed the overflow equally into all channels, then renormalise.
vec3 bleed(vec3 c){ float m = max(c.r, max(c.g, c.b)); if (m > 1.0) { float w = 0.9 * (m - 1.0); c = (c / m + vec3(w)) / (1.0 + w); } return c; }
// round 6, the Sun (Leo frame 2 styleB): the centre is the tint bled toward white (FBF8F1), and the limb darkens faster in blue
// than in red, as the real Sun's does (ECD1B6 at r = 0.95, E5C6A6 in the limb band). Scalar exposure plus per-channel linear
// factors below 1: never a channel clamp.
vec3 sunBase(vec3 lin){ return bleed(lin * 2.33) * 0.975; }
vec3 ldChroma(float mu){ float x = 1.0 - clamp(mu, 0.0, 1.0); float x2 = x * x; return max(vec3(1.0) - vec3(0.30, 0.88, 1.28) * x2 + vec3(0.02, 0.36, 0.48) * x2 * x2, 0.0); }   /* warmer-orange limb like frame 2; the centre is unchanged */
`;
// temperatureToSRGB lookup: 512 texels over log10(T) = 3.0 to 6.0, stored sRGB encoded (brightest channel 1)
const LUT = /* glsl */`
uniform sampler2D uLut;
vec3 tlin(float T){ float u = clamp((log(max(T, 1000.0)) / 2.302585 - 3.0) / 3.0, 0.0, 1.0); return dec(texture2D(uLut, vec2(u * (511.0 / 512.0) + 0.5 / 512.0, 0.5)).rgb); }
`;
// round 7: evolving granulation (Sun disc and the granulation loupe). Each grid cell owns one convective cell with its own life
// (LIFE 8 to 10 s, the real about 8 to 20 minutes scaled for the demo). A cell is born small at a fresh spot, swells, brightens,
// splits in two late in life, then shrinks away while its neighbours fill in. Multiplicatively weighted Voronoi (distance / size),
// so cells grow and fade in place; nothing scrolls. Returns the gap to the nearest lane (0 on a lane) and the cell's brightness.
export const EVO = /* glsl */`
vec2 h22(vec2 p){ return vec2(h21(p), h21(p + 17.31)); }
float evoCells(vec2 g, float t, out float bright){
  vec2 i0 = floor(g); float d1 = 9.0, d2 = 9.0, split = 9.0; bright = 1.0;
  for (int j = -1; j <= 1; j++) for (int i = -1; i <= 1; i++) {
    vec2 c = i0 + vec2(float(i), float(j)); vec2 h = h22(c); float life = 8.0 + 2.0 * h.y;
    float ag = t / life + h.x; float cyc = floor(ag), age = fract(ag); vec2 hc = h22(c + cyc * 13.7);
    vec2 base = c + 0.2 + 0.6 * hc; float w = 0.1 + 0.9 * smoothstep(0.0, 0.22, age) * smoothstep(1.0, 0.78, age);
    float b = (0.95 + 0.05 * h.y) * mix(1.0, 0.9, age) * (0.9 + 0.1 * smoothstep(0.0, 0.2, age));   /* hot when young, cooler as it ages */
    float sp = 0.24 * smoothstep(0.5, 0.85, age); float an = 6.2831853 * hc.x; vec2 dv = vec2(cos(an), sin(an)) * sp;
    /* the two daughters count as one cell against the neighbours; the lane between them opens as they separate */
    float dA = length(g - base - dv) / w, dB = length(g - base + dv) / w, dd = min(dA, dB);
    float sg = abs(dA - dB) / (dA + dB + 1e-3) * 1.6 + 1.0 - smoothstep(0.04, 0.2, sp);
    if (dd < d1) { d2 = d1; d1 = dd; bright = b; split = sg; } else if (dd < d2) d2 = dd;
  }
  return min((d2 - d1) / (d1 + d2 + 1e-3) * 1.6, split);   /* scale-free gap: lanes keep one width whatever the cell sizes */
}
`;
export const strokeVert = /* glsl */`
attribute vec3 aTan; attribute vec3 aUvK; attribute vec4 aA; attribute vec4 aColor; attribute vec4 aParam;
uniform float uFlowT; uniform float uBoilT; uniform float uBoil; uniform float uBoilGain; uniform vec3 uCamLocal; uniform float uCosElev;
uniform float uAlpha; uniform float uWind; uniform float uWindLen; uniform float uPull; uniform float uLayerA[7]; uniform float uCrisp; uniform float uGrow; uniform float uRise; uniform float uExp;
#ifdef STAR
uniform float uTeff; uniform float uExposure; uniform vec3 uPeek; uniform float uPeekOn; uniform float uChroma;
#endif
varying vec4 vColor; varying vec4 vUV;
${HASH}
${SRGB}
#ifdef STAR
${LUT}
#endif
vec3 promDef(vec3 p){ float y0 = max(p.y, 0.0); p.y = y0 * (0.8 + 0.2 * uRise) + 0.9 * uRise * y0 * y0;
  float ang = 0.9 * uRise * y0 + 0.05 * sin(uFlowT * 0.45 + y0 * 14.0); float ca = cos(ang), sa = sin(ang); p.xz = vec2(ca * p.x - sa * p.z, sa * p.x + ca * p.z); return p; }
vec3 rotY(vec3 v, float a){ float c = cos(a), s = sin(a); return vec3(c * v.x + s * v.z, v.y, -s * v.x + c * v.z); }
void main(){
  float side = aA.x, seed = aA.w; float width = aA.y; float kind = aUvK.z;
  const float TAU = 6.2831853;
  float tl = uFlowT / 4.0;
  vec3 p = position; vec3 tn = aTan;
  float r = length(position.xz) + 1e-3; float dth = 0.0, fade = 1.0;
  bool flatK = kind > 5.5 && kind < 6.5;   // FLAT: lies in the disk plane (Angelo's v4 ribbons face the disk normal)
  bool orbK = (kind > 6.5 && kind < 7.5) || kind > 12.5;    // ORBIT: disk arcs at one radius (in the plane) and BODY: the young planets (face the camera), on circular Kepler orbits
  if (kind > 0.5 && kind < 2.5) dth = (7.0 / 32.0) / r * sin(TAU * tl - 1.05 * r);
  // round 7, Kepler shear: every vertex turns at omega = KEPLER_W r^-1.5 (r in AU), so the inner disk laps the outer disk.
  // Band strokes (FLAT) span a little radius, so they shear; each lives LIFE s and is re-dealt at a fresh angle with a
  // crossfade, so the pattern never winds up. Arcs at one radius (ORBIT) just orbit.
  float omK = 1.0 * pow(max(r, 0.3), -1.5);
  if (orbK) dth = omK * uFlowT;
  if (flatK) { const float LIFE = 6.0; float ag = uFlowT / LIFE + h11(seed * 0.173); float cyc = floor(ag), age = fract(ag);
    dth = omK * age * LIFE + h11(seed + cyc * 7.31) * TAU; fade = smoothstep(0.0, 0.15, age) * smoothstep(1.0, 0.85, age) / 0.87; }
  // prominence (PROM, local frame: +y radially out, feet on the limb at y = 0): the arc lifts off the limb (the apex rises most,
  // the feet stay put) and twists a little about the radial axis, more with height; a slow sway runs up the legs. A deformation, not a scale.
  bool promK = kind > 9.5 && kind < 10.5;
  if (promK) { vec3 q0 = promDef(p); tn = promDef(p + tn * 0.01) - q0; p = q0; }   // the tangent follows the deformation, so ribbons keep their width
  // remnant (SNK, face-on, radius 1 = the shell): after the stage ends the debris keeps coasting. Each strand moves out at its own
  // speed (uExp x 0.55 to 1.45), the outer parts lag a little (slow shear); no uniform image scale
  bool snK = kind > 10.5 && kind < 11.5;
  if (snK) { float hs1 = h11(seed * 0.61); float rr0 = length(p.xy); float ang = uExp * 0.6 * (rr0 - 0.9) * (hs1 > 0.5 ? 1.0 : 0.6);
    float ca = cos(ang), sa = sin(ang); p.xy = mat2(ca, sa, -sa, ca) * p.xy * (1.0 + uExp * (0.55 + 0.9 * hs1)); tn.xy = mat2(ca, sa, -sa, ca) * tn.xy; }
  // point lens (LENS, unit = shadow radius, Einstein radius TE): the source drifts in a straight line (wrapping in a +/-B box, faded at
  // the box edge); its images sit at theta = (beta +/- sqrt(beta^2 + 4 TE^2)) / 2 along the source direction (the minus image on the
  // far side), stretched tangentially by |theta|/beta and radially by theta^2/(theta^2 + TE^2). Surface brightness is kept, so the
  // flux follows the magnification; images inside the shadow are captured (hidden).
  bool lensK = kind > 11.5 && kind < 12.5;
  if (lensK) { const float TE = 1.5, BX = 5.0; vec2 b0 = position.xy; float sgn = position.z;
    vec2 vel = aParam.x * normalize(aTan.xy + vec2(1e-6, 0.0));
    vec2 bt = mod(b0 + vel * uFlowT + BX, 2.0 * BX) - BX; float bl = max(length(bt), 1e-3); vec2 bh = bt / bl;
    float ath = abs(0.5 * (bl + sgn * sqrt(bl * bl + 4.0 * TE * TE))); float mr = ath * ath / (ath * ath + TE * TE);
    float S0 = aA.z; float span = min(S0 / bl, 2.4);
    float phi = atan(bh.y, bh.x) + (sgn < 0.0 ? 3.14159265 : 0.0) + (aUvK.y - 0.5) * span;
    p = vec3(ath * cos(phi), ath * sin(phi), 0.0); tn = vec3(-sin(phi), cos(phi), 0.0);
    float wr = max(mr, 0.45); width *= wr;
    fade = (mr / wr) * smoothstep(1.0, 1.1, ath) * smoothstep(BX, BX - 0.8, max(abs(bt.x), abs(bt.y))); }
  // jet knots (JETK): each knot rides out along the jet and fades, then a new one is launched at the base
  bool jetK = kind > 7.5 && kind < 8.5, jetS = kind > 8.5 && kind < 9.5;
  if (jetK) { float su = fract(uFlowT * 0.08 + aParam.x); p.y += sign(position.y) * 8.2 * (su - aParam.x); fade = smoothstep(0.0, 0.12, su) * (1.0 - smoothstep(0.65, 1.0, su)); }
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
  if (promK && aParam.z < 1.5) { float tp = smoothstep(0.0, 0.3, aUvK.y) * smoothstep(1.0, 0.7, aUvK.y); al *= tp; width *= mix(0.3, 1.0, tp); }   /* glow ribbons taper to nothing at the feet: no fans or streaks */
  if (promK && aParam.z > 1.5) al *= 0.62 + 0.38 * smoothstep(-0.2, 0.85, sin(TAU * (aUvK.y * 2.5 - uFlowT * 0.16) + seed * 1.7));   // plasma flows along the loop; a high floor so the arc never empties and snaps back
  if (snK && aParam.x > 0.5) al *= 0.72 + 0.28 * sin(TAU * uFlowT * (0.25 + 0.45 * h11(seed * 1.7)) + seed);   // knots flicker (stepped with the boil)
  if (jetS) al *= 0.6 + 0.4 * smoothstep(0.2, 1.0, sin(TAU * (aUvK.y * 2.5 - uFlowT * 0.35)));   // jet strands: brighter pulses travel outward
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
  vec3 cg = bleed(lin * aColor.r * ld * uExposure);
  if (uChroma > 0.0) { cg = mix(cg, sunBase(lin) * ldChroma(mu) * (0.95 + (aColor.r - 0.86) * 0.8), uChroma); al *= mix(1.0, 0.22, uChroma); }   /* the Sun: faint painted texture over the granulated disc (round 7: lighter so the cells read) */
  col = enc(cg);
  al *= (kind > 3.5 && kind < 4.5) ? smoothstep(-0.7, -0.05, mu) : smoothstep(-0.02, 0.12, mu);   // outflow shells show at the limb
#endif
  vec3 tv = normalize(mat3(modelViewMatrix) * tn);
  vec3 sd = cross(tv, normalize(vp.xyz)); float sl = length(sd); sd = sl > 1e-4 ? sd / sl : vec3(1.0, 0.0, 0.0);
  if (flatK || (kind > 6.5 && kind < 7.5)) { vec3 fs = mat3(modelViewMatrix) * cross(tn, vec3(0.0, 1.0, 0.0)); float fl = length(fs); if (fl > 1e-6) sd = fs / fl; }
  float u = mod(floor(uBoilT * 8.0), 32.0) / 32.0;
  float A = uBoil * aParam.y;
  vec4 hs = vec4(h21(vec2(seed, 1.0)), h21(vec2(seed, 2.0)), h21(vec2(seed, 3.0)), h21(vec2(seed, 4.0)));
  vec2 off = A * vec2(sin(TAU * (u * (1.0 + floor(hs.x * 3.0)) + hs.z)), sin(TAU * (u * (1.0 + floor(hs.y * 3.0)) + hs.w)));
  float cp = floor(aUvK.y * 8.0 + 0.5) * 1.37 + seed;
  vec4 hv = vec4(h21(vec2(cp, 5.0)), h21(vec2(cp, 6.0)), h21(vec2(cp, 7.0)), h21(vec2(cp, 8.0)));
  off += 0.5 * A * vec2(sin(TAU * (u * (1.0 + floor(hv.x * 3.0)) + hv.z)), sin(TAU * (u * (1.0 + floor(hv.y * 3.0)) + hv.w)));
  if (A > 0.0) width *= 1.0 + 0.07 * sin(TAU * (u * (1.0 + floor(hs.z * 3.0)) + hs.x));
  if (jetS || jetK) { vec2 ax = (mat3(modelViewMatrix) * vec3(0.0, 1.0, 0.0)).xy; float axl = length(ax); if (axl > 1e-4) { ax /= axl; off = dot(off, ax) * ax; } }   // jet boil runs along the jet axis
  vp.xy += off * uBoilGain * sc;
  vp.xyz += sd * side * width * 0.5 * sc;
  gl_Position = projectionMatrix * vp;
  vColor = vec4(col, al); vUV = vec4(aUvK.x, aUvK.y, seed, aParam.z);
}`;
// round 7: the painted red supergiant (frame 3a). One ShaderMaterial; strokes are dealt, aimed and coloured live (see buildRSG).
export const rsgVert = /* glsl */`
attribute vec3 aTan; attribute vec3 aUvK; attribute vec4 aA; attribute vec4 aColor; attribute vec4 aParam;
uniform float uFlowT; uniform float uBoilT; uniform float uBoil; uniform float uBoilGain; uniform float uAlpha; uniform float uTeff; uniform float uExposure; uniform float uRedeal;
uniform vec3 uCamO; uniform vec4 uCell[26]; uniform vec2 uCellH[26];
varying vec4 vColor; varying vec4 vUV; varying float vRho;
${HASH}
${SRGB}
${LUT}
void main(){
  const float TAU = 6.2831853; float side = aA.x, width = aA.y, seed = aA.w, t = aUvK.y, li = aParam.x;
  // deal: a fresh spot every LIFE s, crossfaded. Spots are even over the visible disc (the way frame 3a was painted), so no strokes are wasted on the far side
  float life = mix(5.0 + 3.0 * h11(seed * 0.37), 0.125, uRedeal); float ag = uFlowT / life + h11(seed * 0.71);   /* during the swell, re-deal at 8 fps so nothing stretches */ float cyc = floor(ag), age = fract(ag);
  float fade = smoothstep(0.0, 0.2, age) * smoothstep(1.0, 0.8, age);
  vec3 z = normalize(uCamO); vec3 e1 = normalize(cross(abs(z.y) < 0.95 ? vec3(0.0, 1.0, 0.0) : vec3(1.0, 0.0, 0.0), z)); vec3 e2 = cross(z, e1);
  float rr = 1.02 * sqrt(h11(seed + cyc * 7.13)), an = TAU * h11(seed * 1.31 + cyc * 3.77); vec3 c;
  if (li > 1.5) {   /* hot strokes spawn inside a live cell's core */
    vec4 ce = uCell[0]; float bh = -1.0; for (int i = 0; i < 26; i++) { float sc2 = uCellH[i].x * (0.5 + 0.5 * dot(uCell[i].xyz, z)) * h11(seed + cyc * 5.1 + float(i) * 1.7); if (sc2 > bh) { bh = sc2; ce = uCell[i]; } }   /* a hot, visible cell, picked at random */
    vec3 f1 = normalize(cross(abs(ce.y) < 0.95 ? vec3(0.0, 1.0, 0.0) : vec3(1.0, 0.0, 0.0), ce.xyz)), f2 = cross(ce.xyz, f1);
    float ra = ce.w * 0.6 * sqrt(h11(seed + cyc * 2.3)); c = normalize(ce.xyz + ra * (cos(an) * f1 + sin(an) * f2));
  } else { float rq = min(rr, 0.999); c = rq * cos(an) * e1 + rq * sin(an) * e2 + sqrt(1.0 - rq * rq) * z; }
  // round 9, live convection at the spot: roundish bubbly cells (a weighted Voronoi over the live cell field, so they differ in size and merge and
  // are reborn in place), dark intergranular lanes where two cells meet, a bright top at each cell's centre. No swirl, no flow: strokes sit at any angle.
  float best = 99.0, second = 99.0, chh = 0.0;
  for (int i = 0; i < 26; i++) { vec3 d = uCell[i].xyz; float a = sqrt(2.0 * max(1.0 - dot(d, c), 0.0)); float hh = uCellH[i].x;   /* chord length: same as the angle for near cells, no acos */
    float wd = a / (uCell[i].w * (0.72 + 0.28 * hh)); if (wd < best) { second = best; best = wd; chh = hh; } else if (wd < second) second = wd; }
  float gap = (second - best) / (second + best + 1e-3) * 1.6; float lane = smoothstep(0.012, 0.13, gap); float top = exp(-1.5 * best * best);
  float heat = clamp(chh * (0.22 + 0.78 * top), 0.0, 1.0) * mix(0.12, 1.0, lane);
  float ang2 = TAU * h11(seed * 2.9 + cyc * 1.7); vec3 g1 = normalize(cross(abs(c.y) < 0.95 ? vec3(0.0, 1.0, 0.0) : vec3(1.0, 0.0, 0.0), c)); vec3 g2 = cross(c, g1);
  vec3 td = cos(ang2) * g1 + sin(ang2) * g2;
  float len = aColor.r * 0.55, s = (t - 0.5) * len; width *= 1.45;   /* round dabs, not streaks */
  vec3 p = normalize(c + td * s); vec3 tn = normalize(td - p * dot(td, p));
  vec4 vp = modelViewMatrix * vec4(p, 1.0); float sc = length(modelViewMatrix[0].xyz);
  vec3 nrm = normalize(mat3(modelViewMatrix) * p); float mu = dot(nrm, -normalize(vp.xyz)); float mu1 = clamp(mu, 0.0, 1.0);
  // colour: temperatureToSRGB(Teff + dT) x brightness, equal bleed. dT: cell heat (frame: +/-500 K) and a cooler limb (-600 K)
  float jit = aColor.g - 0.5; float dT = 520.0 * (heat - 0.3) + 120.0 + (li > 1.5 ? 40.0 : 0.0) - 400.0 * (1.0 - pow(mu1, 0.8)) + 60.0 * jit;
  float br = (0.8 + 0.2 * pow(mu1, 0.7)) * (1.0 + 0.1 * mu1 * mu1) * (0.95 + 0.10 * jit) * (0.86 + 0.24 * max(heat, 0.55 * smoothstep(0.5, 0.1, mu1))) * (li < 0.5 ? 0.94 : 1.0);
  vec3 cg = bleed(tlin(uTeff + dT) * br * uExposure);
  float al = min(1.0, aColor.a * 1.25) * fade * uAlpha * smoothstep(-0.03, 0.1, mu) * (li > 1.5 ? 1.0 : mix(0.10, 1.0, max(lane, smoothstep(0.5, 0.12, mu1))));   /* thinner paint in the lanes: dark intergranular lanes */
  vec3 tv = normalize(mat3(modelViewMatrix) * tn); vec3 sd = cross(tv, normalize(vp.xyz)); float sl = length(sd); sd = sl > 1e-4 ? sd / sl : vec3(1.0, 0.0, 0.0);
  float u = mod(floor(uBoilT * 8.0), 32.0) / 32.0; float A = uBoil * aParam.y;
  vec4 hs = vec4(h21(vec2(seed, 1.0)), h21(vec2(seed, 2.0)), h21(vec2(seed, 3.0)), h21(vec2(seed, 4.0)));
  vp.xy += A * vec2(sin(TAU * (u * (1.0 + floor(hs.x * 3.0)) + hs.z)), sin(TAU * (u * (1.0 + floor(hs.y * 3.0)) + hs.w))) * uBoilGain * sc;
  vp.xyz += sd * side * width * 0.5 * sc;
  // clean limb: the fragment shader cuts at the disc edge (rho 1 = the glow disc's edge, same projection)
  vec4 cv = modelViewMatrix * vec4(0.0, 0.0, 0.0, 1.0); vRho = length(vp.xy / -vp.z - cv.xy / -cv.z) / (sc / -cv.z);
  gl_Position = projectionMatrix * vp;
  vColor = vec4(enc(cg), al); vUV = vec4(aUvK.x, aUvK.y, seed, aParam.z);
}`;
export const strokeFrag = /* glsl */`
precision highp float;
varying vec4 vColor; varying vec4 vUV;
#ifdef CLIPR
varying float vRho;
#endif
${HASH}
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
#ifdef CLIPR
    a *= mix(1.0, streak * split * trim, 0.12);   /* round 9: softer bubbly dabs, less bristle crunch */
#else
    a *= streak * split * trim;
#endif
#ifdef CLIPR
    col *= 0.97 + 0.06 * hb;   /* soft mottle, matching frame 3a (not a smooth wash) */
    a *= mix(0.85, 1.04, hb);
#else
#ifndef STAR
    col *= 1.0 + (hb - 0.5) * 0.08;
#endif
#endif
  }
#ifdef CLIPR
  edge = smoothstep(0.0, 0.5, u) * smoothstep(0.0, 0.5, 1.0 - u) * smoothstep(0.0, 0.3, min(v, 1.0 - v) * 2.0 + 0.05);   /* soft round dabs, not flakes */
#endif
  a *= edge;
#ifdef CLIPR
  { float lm = 0.99 + 0.05 * (fract(seed * 7.31) - 0.35); a *= 1.0 - smoothstep(lm - 0.07, lm + 0.02, vRho); }   /* round 9: a soft, ragged limb: each stroke ends at its own radius */
#endif
  if (a < 0.002) discard;
  #ifdef ADDITIVE
  gl_FragColor = vec4(col * a, 1.0);
  #else
  gl_FragColor = vec4(col * a, a);
  #endif
}`;
export const spriteVert = /* glsl */`
attribute vec2 aCorner; attribute vec4 aColor; attribute vec2 aSz; uniform float uBreathT; uniform float uBreath; uniform float uAlpha; uniform float uFlowT; uniform float uKepler;
varying vec2 vC; varying vec4 vColor;
void main(){
  float ph = sin(6.2831853 * uBreathT / 4.0);
  float br = 1.0 + aSz.y * uBreath * 0.03 * ph;
  vec3 pp = position; if (uKepler > 0.0) { float rr = length(pp.xz); float a = uKepler * pow(max(rr, 0.3), -1.5) * uFlowT; float c = cos(a), sn = sin(a); pp = vec3(c * pp.x + sn * pp.z, pp.y, -sn * pp.x + c * pp.z); }   // disk planets' glows orbit with them
  vec4 vp = modelViewMatrix * vec4(pp, 1.0); float sc = length(modelViewMatrix[0].xyz);
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
uniform vec3 uPeek; uniform float uPeekOn; uniform float uUseTeff; uniform float uChroma; uniform float uBoilT; uniform float uBoil; uniform float uFlowT; uniform vec4 uRing;
${SRGB}
${LUT}
${HASH}
${EVO}
void main(){
  float d = length(vC) * uMaxR / (1.0 + 0.03 * vBr); vec3 c = vec3(0.0);
  vec3 tint = mix(tlin(uTeff), dec(uPeek), uPeekOn);
  for (int i = 0; i < 5; i++) {
    float u = clamp(1.0 - d / uRad[i], 0.0, 1.0); float f = pow(u, 0.7);
    vec3 lc = uUseTeff > 0.5 ? mix(tint, tlin(uTeff * 0.68), uChroma) : dec(uLay[i].rgb);   /* the Sun's glow is warm and soft */
    c += lc * uLay[i].a * (1.0 + 0.06 * vBr) * (1.0 + 1.3 * uChroma) * f;
  }
  float a = 0.0;
  if (uDisc > 0.0 && d < uDisc) {
    float mu = sqrt(max(0.0, 1.0 - (d / uDisc) * (d / uDisc))); float om = 1.0 - mu;
    // grey limb darkening (G coefficients of LOOK-SPEC 3.2) so every disc pixel is temperatureToSRGB(Teff) x a scalar: the hue never moves
    float ld = 1.0 - 0.47 * om - 0.13 * om * om;
    vec3 disc = (uUseTeff > 0.5 ? tint : dec(uLay[3].rgb)) * ld * uExposure;
    if (uRing.w > 0.0) disc *= mix(0.5, 1.15, smoothstep(0.55, 0.98, d / uDisc)) / ld;   /* (no grey limb darkening here: the rim is bright) */   /* dark lane ground inside, a bright rim so the limb fades into the glow */   /* painted RSG: a dimmer warm base so the cell lanes stay dark */
    if (uChroma > 0.0) { vec2 q = vC * uMaxR / (1.0 + 0.03 * vBr) / uDisc; float rho = length(q); vec2 g = (rho > 1e-4 ? q / rho * asin(min(rho, 0.9999)) : q) * 15.0;
      float cb; float gap = evoCells(g, uFlowT, cb); float fw = fwidth(gap); float ln = smoothstep(0.1 - fw, 0.1 + fw, gap);   /* crisp lanes at any size */
      /* round 7: lanes dark enough to read at viewing size like frame 2 (warm tan, the loupe's lane colour) */
      vec3 sun = sunBase(tint) * ldChroma(mu) * mix(vec3(0.78, 0.64, 0.48), vec3(1.0), ln) * (0.94 + 0.07 * cb) * mix(0.96, 1.0, smoothstep(0.1, 0.6, gap));
      disc = mix(disc, sun, uChroma); }
    float dEdge = uDisc, dSoft = 0.985;
    if (uRing.w > 0.0) { float an0 = atan(vC.y, vC.x); float rg = 0.65 + 0.45 * vn(vec2(an0 * 4.5, 3.1)) + 0.15 * vn(vec2(an0 * 11.0, 7.4)); dEdge = uDisc * (1.0 + 0.03 * (rg - 0.7)); dSoft = 0.945; }   /* the supergiant's limb is soft and ragged, not a cut disc */
    float edge = smoothstep(dEdge, dEdge * dSoft, d);
    c = mix(c, disc + c * 0.15 * (1.0 - uChroma), edge); a = edge;
  }
  if (uRing.w > 0.0) {
    float ang = atan(vC.y, vC.x); float rag = 0.65 + 0.45 * vn(vec2(ang * 4.5, 3.1)) + 0.15 * vn(vec2(ang * 11.0, 7.4));
    float x = (d - 1.0) / (0.055 + 0.03 * rag);   /* ragged, warm-pink falloff like frame 3a, not a thin CG ring */
    c += dec(uRing.rgb) * uRing.w * exp(-x * x) * rag * (x < 0.0 ? 0.28 : 1.0);
  }
  c = bleed(c);
  float m = max(c.r, max(c.g, c.b)); if (m < 1e-4 && a < 0.01) discard;
  a = max(a, clamp(m, 0.0, 1.0)) * uAlpha;
  gl_FragColor = vec4(enc(c) * a, a);
}`;

// round 9: the supergiant's dark intergranular lanes, drawn once over the painted disc from the live cell field (the same weighted Voronoi the strokes use),
// so the lanes are thin, continuous and round the cells whatever the dab size. Soft, ragged and warm; they fade out toward the limb.
export const rsgLaneFrag = /* glsl */`
precision highp float; varying vec2 vC; varying float vBr;
uniform vec4 uCell[26]; uniform vec2 uCellH[26]; uniform vec3 uCamO; uniform vec3 uCamX; uniform vec3 uCamY; uniform float uMaxR; uniform float uAlpha; uniform float uFlowT;
${SRGB}
${HASH}
void main(){
  vec2 q = vC * uMaxR; float rho = length(q); if (rho > 0.985) discard;
  vec3 z = normalize(uCamO); vec3 ex = normalize(uCamX - z * dot(uCamX, z)); vec3 ey = cross(z, ex);
  vec3 c = normalize(q.x * ex + q.y * ey + sqrt(max(1.0 - rho * rho, 0.0)) * z);
  float best = 99.0, second = 99.0;
  for (int i = 0; i < 26; i++) { float a = sqrt(2.0 * max(1.0 - dot(uCell[i].xyz, c), 0.0)); float wd = a / (uCell[i].w * (0.72 + 0.28 * uCellH[i].x)); if (wd < best) { second = best; best = wd; } else if (wd < second) second = wd; }
  float gap = (second - best) / (second + best + 1e-3) * 1.6; float fw = fwidth(gap);
  float rag = 0.55 + 0.9 * vn(c.xy * 19.0 + c.z * 13.0) * (0.6 + 0.4 * vn(c.yz * 41.0));
  float lane = 1.0 - smoothstep(0.0 - fw, 0.30 * rag + fw, gap);
  lane *= smoothstep(0.985, 0.82, rho);
  float a = lane * lane * 0.62 * uAlpha; if (a < 0.004) discard;
  vec3 col = vec3(0.36, 0.17, 0.06);
  gl_FragColor = vec4(enc(col) * a, a);
}`;
