// Screen-space fat line segments. WebGL LineBasicMaterial is 1 px on most GPUs, which shimmers
// under a moving headset. Each input segment becomes a 2-triangle ribbon whose width is in pixels.
import { REFRACT_GLSL } from "./ns-astro.js";

const VERT = REFRACT_GLSL + /* glsl */`
attribute vec3 aOther;
attribute float aSide;
uniform vec2 uResolution;
uniform float uWidthPx;
void main() {
  vec4 startW = modelMatrix * vec4(position, 1.0);
  vec4 endW = modelMatrix * vec4(aOther, 1.0);
  startW.xyz = nsRefractWorld(startW.xyz);
  endW.xyz = nsRefractWorld(endW.xyz);
  vec4 startC = projectionMatrix * viewMatrix * startW;
  vec4 endC = projectionMatrix * viewMatrix * endW;
  // Perspective-correct NDC direction, then a pixel-sized offset along the screen normal.
  vec2 dir = endC.xy / max(abs(endC.w), 1e-5) - startC.xy / max(abs(startC.w), 1e-5);
  float len = length(dir);
  vec2 n = len > 1e-6 ? vec2(-dir.y, dir.x) / len : vec2(0.0, 1.0);
  gl_Position = startC;
  gl_Position.xy += n * aSide * uWidthPx / max(uResolution, vec2(1.0)) * 2.0 * gl_Position.w;
}
`;
const FRAG = /* glsl */`
uniform vec3 uColor;
uniform float uOpacity;
void main() {
  gl_FragColor = vec4(uColor, uOpacity);
  #include <colorspace_fragment>
}
`;

/** positions: flat [x,y,z,...] of segment start/end pairs (same layout as LineSegments). */
export function fatLineSegments(THREE, positions, { color, opacity = 1, widthPx = 2, uRefract } = {}) {
  const nSeg = Math.floor(positions.length / 6);
  const pos = new Float32Array(nSeg * 4 * 3);
  const other = new Float32Array(nSeg * 4 * 3);
  const side = new Float32Array(nSeg * 4);
  const idx = new Uint32Array(nSeg * 6);
  for (let i = 0; i < nSeg; i++) {
    const ax = positions[i * 6], ay = positions[i * 6 + 1], az = positions[i * 6 + 2];
    const bx = positions[i * 6 + 3], by = positions[i * 6 + 4], bz = positions[i * 6 + 5];
    const o = i * 4;
    // Four corners: start ±, end ±. "position" is this end, aOther is the other end.
    const ends = [[ax, ay, az, bx, by, bz], [ax, ay, az, bx, by, bz], [bx, by, bz, ax, ay, az], [bx, by, bz, ax, ay, az]];
    const sides = [1, -1, 1, -1];
    for (let k = 0; k < 4; k++) {
      pos[(o + k) * 3] = ends[k][0]; pos[(o + k) * 3 + 1] = ends[k][1]; pos[(o + k) * 3 + 2] = ends[k][2];
      other[(o + k) * 3] = ends[k][3]; other[(o + k) * 3 + 1] = ends[k][4]; other[(o + k) * 3 + 2] = ends[k][5];
      side[o + k] = sides[k];
    }
    // 0=start+, 1=start-, 2=end+, 3=end-
    idx[i * 6] = o; idx[i * 6 + 1] = o + 1; idx[i * 6 + 2] = o + 2;
    idx[i * 6 + 3] = o + 1; idx[i * 6 + 4] = o + 3; idx[i * 6 + 5] = o + 2;
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute("position", new THREE.BufferAttribute(pos, 3));
  g.setAttribute("aOther", new THREE.BufferAttribute(other, 3));
  g.setAttribute("aSide", new THREE.BufferAttribute(side, 1));
  g.setIndex(new THREE.BufferAttribute(idx, 1));
  g.boundingSphere = new THREE.Sphere(new THREE.Vector3(), 2000);
  const mat = new THREE.ShaderMaterial({
    uniforms: {
      uRefract: uRefract || { value: 0 },
      uResolution: { value: new THREE.Vector2(1024, 1024) },
      uWidthPx: { value: widthPx },
      uColor: { value: new THREE.Color(color) },
      uOpacity: { value: opacity },
    },
    vertexShader: VERT, fragmentShader: FRAG,
    transparent: true, depthWrite: false, side: THREE.DoubleSide,
  });
  const mesh = new THREE.Mesh(g, mat);
  mesh.frustumCulled = false;
  return {
    mesh, material: mat,
    setWidth(px) { mat.uniforms.uWidthPx.value = px; },
    setOpacity(o) { mat.uniforms.uOpacity.value = o; },
    setResolution(w, h) { mat.uniforms.uResolution.value.set(w, h); },
    setAdditive(on) { mat.blending = on ? THREE.AdditiveBlending : THREE.NormalBlending; },
    dispose() { g.dispose(); mat.dispose(); },
  };
}

/** Pixel width for constellation / grid lines: a little over 1 px on a flat screen, thicker in XR and passthrough. */
export function lineWidthPx({ xr = false, passthrough = false } = {}) {
  if (passthrough) return 3.2;
  if (xr) return 2.4;
  return 1.8;
}
export function starMinPx({ xr = false, passthrough = false } = {}) {
  if (passthrough) return 3.6;
  if (xr) return 2.4;
  return 1.6;
}
export function passthroughArtAlpha(artalpha) {
  return Math.min(1, (artalpha ?? 0.40) * 1.8);
}
