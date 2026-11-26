// Stars: one Points draw call, custom shader (design 6.4). Positions are J2000 unit vectors * 900 in skyGroup.
import { SKY_R } from "../ns-util.js";
import { REFRACT_GLSL } from "../ns-astro.js";

// Starting values; tune on a Quest 3 (design Q2). Angular size: deg = clamp(A + B*(6.5 - mag), MIN, MAX).
export const STAR_CONFIG = { A: 0.06, B: 0.03, MIN_DEG: 0.06, MAX_DEG: 0.30, MIN_PX: 1.6, MAX_PX: 32 };

const VERT = REFRACT_GLSL + /* glsl */`
uniform float uViewportH, uMagLimit, uGround, uExtinction, uDaylight, uScale;
uniform float uA, uB, uMinDeg, uMaxDeg, uMinPx, uMaxPx;
attribute float aMag;
attribute vec3 aColor;
varying vec3 vColor;
varying float vAlpha;
void main() {
  vec4 wp = modelMatrix * vec4(position, 1.0);
  wp.xyz = nsRefractWorld(wp.xyz); // Real Sky: Saemundsson lift; night mode is a no-op
  vec3 dir = normalize(wp.xyz - cameraPosition);
  float alt = degrees(asin(clamp(dir.y, -1.0, 1.0)));
  // Kasten and Young (1989) airmass, k = 0.25 mag per airmass (ns-astro.js extinctionMag)
  float a1 = max(alt, 0.0);
  float X = 1.0 / (sin(radians(a1)) + 0.50572 * pow(max(alt + 6.07995, 0.01), -1.6364));
  float mag = aMag + uExtinction * 0.25 * (min(X, 40.0) - 1.0);
  float vis = step(aMag, uMagLimit);
  // ground on: hide below -0.5 deg with a soft fade over the first degree
  vis *= mix(1.0, smoothstep(-0.5, 0.5, alt), uGround);
  // daylight (real sky mode): limiting magnitude falls as the Sun rises
  float lim = mix(6.5, -1.5, uDaylight);
  vis *= clamp((lim - mag) * 0.8 + 0.2, 0.0, 1.0);
  float deg = clamp(uA + uB * (6.5 - aMag), uMinDeg, uMaxDeg);
  float px = radians(deg) * 0.5 * uViewportH * projectionMatrix[1][1];
  gl_PointSize = clamp(px * uScale, uMinPx, uMaxPx) * step(0.001, vis);
  vAlpha = vis * clamp(0.3 + 0.7 * (6.5 - mag) / 5.0, 0.18, 1.0);
  vColor = aColor;
  gl_Position = projectionMatrix * viewMatrix * wp;
}`;
const FRAG = /* glsl */`
varying vec3 vColor;
varying float vAlpha;
void main() {
  vec2 c = gl_PointCoord - 0.5;
  float r = length(c) * 2.0;
  float a = (smoothstep(1.0, 0.0, r) * 0.45 + smoothstep(0.5, 0.0, r) * 0.75) * vAlpha;
  if (a < 0.01) discard;
  gl_FragColor = vec4(vColor, a);
}`;

export function starsLayer() {
  let points, mat;
  return {
    id: "stars",
    init(ctx) {
      const { THREE, catalog } = ctx; const s = catalog.stars, lut = catalog.bvLut;
      const pos = new Float32Array(3 * s.n), mag = new Float32Array(s.n), col = new Float32Array(3 * s.n);
      for (let i = 0; i < s.n; i++) {
        pos[3 * i] = s.vec[3 * i] * SKY_R; pos[3 * i + 1] = s.vec[3 * i + 1] * SKY_R; pos[3 * i + 2] = s.vec[3 * i + 2] * SKY_R;
        mag[i] = s.mag[i];
        const bv = s.bv[i];
        if (Number.isFinite(bv)) {
          const k = Math.round(Math.min(1, Math.max(0, (bv - lut.bvMin) / (lut.bvMax - lut.bvMin))) * (lut.n - 1));
          col[3 * i] = lut.rgb[3 * k] / 255; col[3 * i + 1] = lut.rgb[3 * k + 1] / 255; col[3 * i + 2] = lut.rgb[3 * k + 2] / 255;
        } else { col[3 * i] = col[3 * i + 1] = col[3 * i + 2] = 1; } // no B-V: white
      }
      const g = new THREE.BufferGeometry();
      g.setAttribute("position", new THREE.BufferAttribute(pos, 3));
      g.setAttribute("aMag", new THREE.BufferAttribute(mag, 1));
      g.setAttribute("aColor", new THREE.BufferAttribute(col, 3));
      g.boundingSphere = new THREE.Sphere(new THREE.Vector3(), SKY_R * 1.01);
      const C = STAR_CONFIG;
      mat = new THREE.ShaderMaterial({
        uniforms: { uRefract: ctx.frame.uRefract, uViewportH: { value: 800 }, uMagLimit: { value: 6.5 }, uGround: { value: 1 }, uExtinction: { value: 1 }, uDaylight: { value: 0 },
          uA: { value: C.A }, uB: { value: C.B }, uMinDeg: { value: C.MIN_DEG }, uMaxDeg: { value: C.MAX_DEG }, uMinPx: { value: C.MIN_PX }, uMaxPx: { value: C.MAX_PX }, uScale: { value: 1 } },
        vertexShader: VERT, fragmentShader: FRAG, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending,
      });
      points = new THREE.Points(g, mat);
      points.frustumCulled = false; points.renderOrder = 2;
      ctx.skyGroup.add(points);
    },
    update(ctx) {
      const u = mat.uniforms, st = ctx.state;
      u.uViewportH.value = ctx.frame.viewportH; u.uMagLimit.value = st.mag; u.uGround.value = st.ground ? 1 : 0;
      u.uDaylight.value = ctx.frame.daylight;
      u.uScale.value = ctx.frame.starScale || 1; // 1 in the headset (true angular size); up to 2.2x on flat screens
    },
    setVisible(on) { points.visible = on; },
    dispose() { points.geometry.dispose(); mat.dispose(); },
  };
}
