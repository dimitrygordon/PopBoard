// Star trails (design 6.4): for the ~600 brightest stars, 32 segments along Rz(+k) P v for k = 0..12 h (sidereal
// angle 15.041 deg per hour), built in the date frame so the tail is exactly the star's path over the last k hours.
// A uniform hides the tail beyond the chosen length. Rebuilt only when the date moves by more than 2 years (P drifts).
import { SKY_R, apply } from "../ns-util.js";
import { precessionMatrix, centuriesSinceJ2000, SIDEREAL_DAY_S, REFRACT_GLSL } from "../ns-astro.js";

export const TRAIL_CONFIG = { stars: 600, segments: 32, hours: 12 };
const DEG_PER_HOUR = 360 * 3600 / SIDEREAL_DAY_S; // 15.041

export function trailsLayer() {
  let lines, builtT = null;
  function build(ctx) {
    const { THREE, catalog } = ctx; const s = catalog.stars; const T = centuriesSinceJ2000(ctx.frame.simMs);
    const P = precessionMatrix(T), n = Math.min(TRAIL_CONFIG.stars, s.n), S = TRAIL_CONFIG.segments, R = SKY_R - 8;
    const pos = new Float32Array(n * S * 6), kk = new Float32Array(n * S * 2), mg = new Float32Array(n * S * 2);
    let o = 0;
    for (let i = 0; i < n; i++) {
      const v = apply(P, s.starVec(i));
      for (let j = 0; j < S; j++) for (const step of [j, j + 1]) {
        const hours = (step / S) * TRAIL_CONFIG.hours, a = hours * DEG_PER_HOUR * Math.PI / 180, c = Math.cos(a), sn = Math.sin(a);
        pos[o * 3] = (c * v[0] - sn * v[1]) * R; pos[o * 3 + 1] = (sn * v[0] + c * v[1]) * R; pos[o * 3 + 2] = v[2] * R;
        kk[o] = hours; mg[o] = s.mag[i]; o++;
      }
    }
    const g = new THREE.BufferGeometry();
    g.setAttribute("position", new THREE.BufferAttribute(pos, 3)); g.setAttribute("aK", new THREE.BufferAttribute(kk, 1)); g.setAttribute("aMag", new THREE.BufferAttribute(mg, 1));
    if (!lines) {
      lines = new THREE.LineSegments(g, new THREE.ShaderMaterial({
        uniforms: { uRefract: ctx.frame.uRefract, uHours: { value: 0 }, uDir: { value: 1 } },
        vertexShader: REFRACT_GLSL + "attribute float aK; attribute float aMag; uniform float uHours; varying float vA; void main(){ vA = (aK <= uHours + 1e-3 ? 1.0 - aK / max(uHours, 0.01) * 0.85 : 0.0) * clamp(1.2 - aMag * 0.25, 0.25, 1.0); vec4 wp = modelMatrix * vec4(position, 1.0); wp.xyz = nsRefractWorld(wp.xyz); gl_Position = projectionMatrix * viewMatrix * wp; }",
        fragmentShader: "varying float vA; void main(){ if (vA < 0.01) discard; gl_FragColor = vec4(vec3(0.75, 0.82, 1.0) * vA, vA); }",
        transparent: true, depthWrite: false, blending: THREE.AdditiveBlending,
      }));
      lines.renderOrder = 2; lines.frustumCulled = false; ctx.dateGroup.add(lines);
    } else { lines.geometry.dispose(); lines.geometry = g; }
    builtT = T;
  }
  return {
    id: "trails",
    init() {},
    update(ctx) {
      const h = ctx.state.trails;
      if (!h) { if (lines) lines.visible = false; return; }
      const T = centuriesSinceJ2000(ctx.frame.simMs);
      if (!lines || Math.abs(T - builtT) > 0.02) build(ctx);
      lines.visible = true; lines.material.uniforms.uHours.value = h;
    },
    setVisible(on) { if (lines) lines.visible = on; },
    dispose() { if (lines) lines.geometry.dispose(); },
  };
}
