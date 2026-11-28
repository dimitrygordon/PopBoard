// Gravity Force Lab VR: Leo's painted style B for the 3D scenes. Three pieces, all in code (no textures to host):
//  1. paintMaterial(): a matte painted tone. Light is cut into soft bands, shadows lean navy, lit sides lean warm
//     cream, and long brush strokes run across each surface.
//  2. addOutlines(): warm ink outlines (#2A2420) drawn as a back-face shell pushed out in screen space, so the line
//     stays about the same width at any distance.
//  3. FatLine: screen-space lines with a real pixel width (WebGL lines are 1 px), for marble paths and orbits.
// Line boil: outlines and strokes step to a new random offset 8 times a second, like the Stellar Life frames.
// Calm lines holds them still (uBoil = 0), and is on by default with prefers-reduced-motion.
import { mergeVertices } from "../vendor/three/BufferGeometryUtils.js";
export const PAINT = { ink: 0x2A2420, cream: [1.0, 0.925, 0.81], navy: [0.12, 0.15, 0.34], boilFps: 8, outlinePx: 0.8 };

export function paintUniforms(THREE) {
  return { uBoilT: { value: 0 }, uBoil: { value: 1 }, uRes: { value: new THREE.Vector2(1280, 800) } };
}
const HASH = `
float gfH(vec3 p){ p = fract(p * 0.3183099 + 0.1); p *= 17.0; return fract(p.x * p.y * p.z * (p.x + p.y + p.z)); }
float gfN(vec3 x){ vec3 i = floor(x); vec3 f = fract(x); f = f * f * (3.0 - 2.0 * f);
  return mix(mix(mix(gfH(i), gfH(i + vec3(1,0,0)), f.x), mix(gfH(i + vec3(0,1,0)), gfH(i + vec3(1,1,0)), f.x), f.y),
             mix(mix(gfH(i + vec3(0,0,1)), gfH(i + vec3(1,0,1)), f.x), mix(gfH(i + vec3(0,1,1)), gfH(i + vec3(1,1,1)), f.x), f.y), f.z); }
`;
/** Patch a Lambert material in place into the painted tone. Shares the boil uniforms. */
export function paintMaterial(mat, U, o = {}) {
  if (mat.userData.gfPaint) return mat; mat.userData.gfPaint = true;
  const strokeScale = o.strokeScale || 1;
  mat.onBeforeCompile = (sh) => {
    sh.uniforms.uBoilT = U.uBoilT; sh.uniforms.uBoil = U.uBoil;
    sh.vertexShader = sh.vertexShader.replace("#include <common>", "#include <common>\nvarying vec3 vGfW;")
      .replace("#include <project_vertex>", "#include <project_vertex>\nvGfW = (modelMatrix * vec4(transformed, 1.0)).xyz;");
    sh.fragmentShader = sh.fragmentShader.replace("#include <common>", "#include <common>\nvarying vec3 vGfW; uniform float uBoilT; uniform float uBoil;" + HASH)
      .replace("#include <dithering_fragment>", `#include <dithering_fragment>
      {
        vec3 c = gl_FragColor.rgb; float l = dot(c, vec3(0.299, 0.587, 0.114));
        float step8 = floor(uBoilT * ${PAINT.boilFps.toFixed(1)}) * uBoil;
        vec3 q = vGfW * ${(28 * strokeScale).toFixed(1)};
        float n = gfN(vec3(q.x * 0.22 + q.z * 0.14, q.y * 1.15 + q.x * 0.25, q.z * 0.22) + vec3(step8 * 0.37, 0.0, step8 * 0.11));
        float n2 = gfN(q * 0.42 + 11.0);
        float band = floor(l * 5.0 + 0.5) / 5.0; float lb = mix(l, band, 0.72);
        vec3 col = c * (lb / max(l, 1e-3));
        col += vec3(0.045, 0.05, 0.09) * (1.0 - smoothstep(0.12, 0.58, l));
        col = mix(col, col * vec3(${PAINT.navy.map((v) => (v * 2.2).toFixed(3)).join(", ")}) + vec3(${PAINT.navy.map((v) => (v * 0.35).toFixed(3)).join(", ")}), (1.0 - smoothstep(0.05, 0.48, l)) * 0.4);
        col = mix(col, vec3(${PAINT.cream.join(", ")}) * max(l, 0.52), smoothstep(0.38, 0.92, l) * 0.46);
        col *= 0.78 + 0.4 * n * (0.6 + 0.7 * n2);
        gl_FragColor.rgb = min(col, vec3(${PAINT.cream.join(", ")}));
      }`);
  };
  mat.customProgramCacheKey = () => "gfpaint" + strokeScale;
  mat.needsUpdate = true; return mat;
}

/** Ink outline shell for one mesh: the same geometry, back faces only, pushed out along the normal in screen pixels. */
export function outlineMaterial(THREE, U, px = PAINT.outlinePx) {
  return new THREE.ShaderMaterial({
    side: THREE.BackSide, uniforms: { uBoilT: U.uBoilT, uBoil: U.uBoil, uRes: U.uRes, uPx: { value: px }, uInk: { value: new THREE.Color(PAINT.ink) } },
    vertexShader: `uniform float uBoilT; uniform float uBoil; uniform vec2 uRes; uniform float uPx; ${HASH}
      void main(){
        vec4 clip = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
        vec3 nv = normalize(normalMatrix * normal); vec2 nd = (projectionMatrix * vec4(nv, 0.0)).xy; float L = length(nd);
        float step8 = floor(uBoilT * ${PAINT.boilFps.toFixed(1)}) * uBoil;
        float wob = 0.94 + 0.12 * gfN(position * 28.0 + vec3(step8 * 0.8, step8 * 0.45, 0.0));
        if (L > 1e-5) clip.xy += nd / L * (uPx * wob * 2.0 / uRes.y) * clip.w;
        gl_Position = clip;
      }`,
    fragmentShader: "uniform vec3 uInk; void main(){ gl_FragColor = vec4(uInk, 1.0); }",
  });
}
/** True when a mesh should not get an ink outline: named shadows, the balance plinth (body), tiny parts, or a flag. */
export function skipOutline(mesh, root) {
  if (!mesh || mesh.userData.noOutline) return true;
  const n = mesh.name || "", mn = (mesh.material && mesh.material.name) || "";
  if (/shadow|plinth/i.test(n) || /shadow|plinth/i.test(mn)) return true;
  const mat = mesh.material; if (mat && (mat.transparent || mat.opacity < 0.99)) return true;
  const rn = (root && root.name) || (mesh.parent && mesh.parent.name) || "";
  if (n === "body" && /balance/i.test(rn)) return true;
  return false;
}
/** Paint and outline every opaque Lambert mesh under root. Skips labels, lines, glows, shadows and anything tiny. */
export function paintTree(THREE, root, U, o = {}) {
  const olMat = outlineMaterial(THREE, U, o.px);
  const list = []; root.traverse((m) => { if (m.isMesh && !m.userData.noPaint && m.material && m.material.isMeshLambertMaterial && !m.material.transparent) list.push(m); });
  const quiet = (m) => { for (let o = m; o; o = o.parent) if (o.userData && o.userData.noNoise) return true; return false; };
  for (const m of list) {
    if (!quiet(m)) paintMaterial(m.material, U, o);
    if (skipOutline(m, root)) continue;
    if (!m.geometry.boundingSphere) m.geometry.computeBoundingSphere();
    const s = m.getWorldScale(new THREE.Vector3()); const r = m.geometry.boundingSphere.radius * Math.max(s.x, s.y, s.z);
    if (r < (o.minR || 0.01)) continue;
    const ol = new THREE.Mesh(smoothShell(THREE, m.geometry), olMat); ol.userData.noPaint = true; ol.userData.gfOutline = true; ol.renderOrder = m.renderOrder;
    m.add(ol);
  }
  return list.length;
}

const SHELLS = new WeakMap();
/** Welded copy with smooth normals, so box and cylinder outlines do not split at the corners. */
function smoothShell(THREE, geo) {
  let g = SHELLS.get(geo); if (g) return g;
  g = new THREE.BufferGeometry(); g.setAttribute("position", geo.attributes.position.clone()); if (geo.index) g.setIndex(geo.index.clone());
  try { g = mergeVertices(g, 1e-4); } catch { /* keep the unwelded copy */ }
  g.computeVertexNormals(); SHELLS.set(geo, g); return g;
}
/** Screen-space thick line. setPoints([Vector3...]); width in CSS-ish pixels relative to uRes. */
export class FatLine {
  constructor(THREE, U, { color = 0xFFD27A, width = 3, opacity = 1, max = 700, dashed = false } = {}) {
    this.T = THREE; this.max = max;
    const g = new THREE.BufferGeometry();
    const n = max * 2; this.pos = new Float32Array(n * 3); this.prev = new Float32Array(n * 3); this.next = new Float32Array(n * 3); this.side = new Float32Array(n); this.along = new Float32Array(n);
    for (let i = 0; i < max; i++) { this.side[2 * i] = -1; this.side[2 * i + 1] = 1; }
    const idx = []; for (let i = 0; i < max - 1; i++) { const a = 2 * i; idx.push(a, a + 1, a + 2, a + 1, a + 3, a + 2); }
    g.setIndex(idx);
    g.setAttribute("position", new THREE.BufferAttribute(this.pos, 3)); g.setAttribute("aPrev", new THREE.BufferAttribute(this.prev, 3)); g.setAttribute("aNext", new THREE.BufferAttribute(this.next, 3));
    g.setAttribute("aSide", new THREE.BufferAttribute(this.side, 1)); g.setAttribute("aAlong", new THREE.BufferAttribute(this.along, 1));
    g.setDrawRange(0, 0);
    this.mat = new THREE.ShaderMaterial({
      transparent: opacity < 1 || dashed, depthWrite: false, side: THREE.DoubleSide,
      uniforms: { uRes: U.uRes, uW: { value: width }, uC: { value: new THREE.Color(color) }, uA: { value: opacity }, uDash: { value: dashed ? 1 : 0 } },
      vertexShader: `uniform vec2 uRes; uniform float uW; attribute vec3 aPrev; attribute vec3 aNext; attribute float aSide; attribute float aAlong; varying float vAlong;
        void main(){
          mat4 M = projectionMatrix * modelViewMatrix; vec4 c = M * vec4(position, 1.0); vec4 p = M * vec4(aPrev, 1.0); vec4 n = M * vec4(aNext, 1.0);
          vec2 asp = vec2(uRes.x / uRes.y, 1.0);
          vec2 sc = c.xy / c.w * asp, sp = p.xy / p.w * asp, sn = n.xy / n.w * asp;
          vec2 d = sn - sp; if (length(d) < 1e-6) d = vec2(1.0, 0.0); d = normalize(d);
          vec2 nrm = vec2(-d.y, d.x) / asp;
          c.xy += nrm * aSide * uW / uRes.y * c.w;
          vAlong = aAlong; gl_Position = c;
        }`,
      fragmentShader: `uniform vec3 uC; uniform float uA; uniform float uDash; varying float vAlong;
        void main(){ if (uDash > 0.5 && fract(vAlong * 18.0) > 0.55) discard; gl_FragColor = vec4(uC, uA); }`,
    });
    this.mesh = new THREE.Mesh(g, this.mat); this.mesh.frustumCulled = false; this.mesh.renderOrder = 20; this.mesh.userData.noPaint = true;
  }
  setPoints(pts) {
    const n = Math.min(this.max, pts.length); let acc = 0;
    for (let i = 0; i < n; i++) {
      const p = pts[i], a = pts[Math.max(0, i - 1)], b = pts[Math.min(n - 1, i + 1)];
      if (i > 0) acc += p.distanceTo(pts[i - 1]);
      for (let k = 0; k < 2; k++) { const j = (2 * i + k) * 3; this.pos[j] = p.x; this.pos[j + 1] = p.y; this.pos[j + 2] = p.z; this.prev[j] = a.x; this.prev[j + 1] = a.y; this.prev[j + 2] = a.z; this.next[j] = b.x; this.next[j + 1] = b.y; this.next[j + 2] = b.z; this.along[2 * i + k] = acc; }
    }
    const g = this.mesh.geometry; for (const k of ["position", "aPrev", "aNext", "aAlong"]) g.attributes[k].needsUpdate = true;
    g.setDrawRange(0, Math.max(0, (n - 1) * 6));
  }
  set color(c) { this.mat.uniforms.uC.value.set(c); }
  set opacity(a) { this.mat.uniforms.uA.value = a; this.mat.transparent = true; }
  set width(w) { this.mat.uniforms.uW.value = w; }
}
