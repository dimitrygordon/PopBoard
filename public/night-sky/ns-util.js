import { REFRACT_GLSL } from "./ns-astro.js";
// Small three.js helpers shared by the layers.
export const SKY_R = 900; // stars sit on a sphere of radius 900 m around the eye; far plane 2000 (design 6.4)
export function setMatrix3(m4, m) { m4.set(m[0], m[1], m[2], 0, m[3], m[4], m[5], 0, m[6], m[7], m[8], 0, 0, 0, 0, 1); return m4; }
export function apply(m, v) { return [m[0] * v[0] + m[1] * v[1] + m[2] * v[2], m[3] * v[0] + m[4] * v[1] + m[5] * v[2], m[6] * v[0] + m[7] * v[1] + m[8] * v[2]]; }
export function applyT(m, v) { return [m[0] * v[0] + m[3] * v[1] + m[6] * v[2], m[1] * v[0] + m[4] * v[1] + m[7] * v[2], m[2] * v[0] + m[5] * v[1] + m[8] * v[2]]; }
export function raDecVec(raDeg, decDeg) { const a = raDeg * Math.PI / 180, d = decDeg * Math.PI / 180; return [Math.cos(d) * Math.cos(a), Math.cos(d) * Math.sin(a), Math.sin(d)]; }

/** Patch a built-in three.js material so vertices in skyGroup/dateGroup are lifted by refraction when uRefract.value is 1. */
export function attachRefraction(mat, uRefract) {
  const prev = mat.onBeforeCompile;
  mat.onBeforeCompile = (shader, renderer) => {
    if (prev) prev(shader, renderer);
    shader.uniforms.uRefract = uRefract;
    shader.vertexShader = REFRACT_GLSL + shader.vertexShader.replace(
      "#include <project_vertex>",
      `vec4 mvPosition = vec4(transformed, 1.0);
#ifdef USE_INSTANCING
      mvPosition = instanceMatrix * mvPosition;
#endif
      mvPosition = modelMatrix * mvPosition;
      mvPosition.xyz = nsRefractWorld(mvPosition.xyz);
      mvPosition = viewMatrix * mvPosition;
      gl_Position = projectionMatrix * mvPosition;`
    );
  };
  const prevKey = mat.customProgramCacheKey ? mat.customProgramCacheKey.bind(mat) : () => "";
  mat.customProgramCacheKey = () => prevKey() + "|ns-refract";
  mat.needsUpdate = true;
  return mat;
}
