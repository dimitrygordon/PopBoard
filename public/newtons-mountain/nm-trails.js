// Newton's Mountain: shot visuals. Camera-facing ribbons for trails, billboard balls, landing flags, arrows and labels.
// Trail points are float32 and RELATIVE to the frame's origin (the muzzle in Mountain view, Earth's centre in Model view);
// the sim subtracts in doubles first (nm-frames toGpuRelative). The mesh matrix puts them in the room. Far-side occlusion by the
// Earth is analytic in the shader (NM_OCCLUDE in nm-scene.js). All far-field objects are depthWrite = false.
import { textSprite } from "./nm-sprite.js";
import { NM_OCCLUDE } from "./nm-scene.js";
import { NM_CONFIG as C } from "./nm-config.js";
import { toGpuRelative, simToWorld } from "./nm-frames.js";
import { TrailBuffer } from "./nm-trailbuf.js";

const RIBBON_VERT = /* glsl */`
attribute vec3 aOther; attribute float aSide; attribute float aT;
uniform float uDeg, uMinPx; varying vec3 vW; varying float vT;
void main() {
  vec4 sw = modelMatrix * vec4(position, 1.0), ew = modelMatrix * vec4(aOther, 1.0);
  vec3 sv = (viewMatrix * sw).xyz, ev = (viewMatrix * ew).xyz; float zn = -0.06;
  vW = sw.xyz; vT = aT;
  if (sv.z > zn && ev.z > zn) { gl_Position = vec4(2.0, 2.0, 2.0, 1.0); return; }
  if (sv.z > zn) sv = mix(sv, ev, (zn - sv.z) / (ev.z - sv.z));
  if (ev.z > zn) ev = mix(ev, sv, (zn - ev.z) / (sv.z - ev.z));
  vec4 sc = projectionMatrix * vec4(sv, 1.0), ec = projectionMatrix * vec4(ev, 1.0);
  float aspect = projectionMatrix[1][1] / projectionMatrix[0][0];
  vec2 a = sc.xy / sc.w, b = ec.xy / ec.w, d = (b - a) * vec2(aspect, 1.0);
  float L = length(d); vec2 n = L > 1e-7 ? vec2(-d.y, d.x) / L : vec2(0.0, 1.0);
  float px = max(uMinPx, radians(uDeg) * 0.5 * uViewportH * projectionMatrix[1][1]);
  gl_Position = sc; gl_Position.xy += n * aSide * px * 2.0 / uViewportH * vec2(1.0 / aspect, 1.0) * sc.w;
}`;
const RIBBON_FRAG = /* glsl */`
uniform vec3 uColor; uniform float uOpacity, uDash, uTailFade; varying vec3 vW; varying float vT;
void main() {
  if (nmHidden(vW) > 0.5) discard;
  float a = uOpacity * nmNearFade(vW); float fd = mix(1.0, 0.35 + 0.65 * vT, uTailFade);
  if (uDash > 0.0 && mod(floor(vT * uDash), 2.0) > 0.5) discard;
  if (a < 0.01) discard;
  gl_FragColor = vec4(uColor * fd, a);
  #include <colorspace_fragment>
}`;
const BALL_VERT = /* glsl */`
attribute vec3 aColor; attribute float aAlive; uniform float uMinDeg, uRadius; varying vec3 vColor; varying float vA;
void main() {
  vec4 w = modelMatrix * vec4(position, 1.0); vec4 mv = viewMatrix * w; float dist = max(length(mv.xyz), 0.05);
  float vis = aAlive * (1.0 - nmHidden(w.xyz)) * nmNearFade(w.xyz);
  float minPx = radians(uMinDeg) * 0.5 * uViewportH * projectionMatrix[1][1], realPx = (2.0 * uRadius / dist) * 0.5 * uViewportH * projectionMatrix[1][1];
  gl_PointSize = max(minPx, realPx) * step(0.01, vis) * 2.4; vColor = aColor; vA = vis;
  gl_Position = projectionMatrix * mv;
}`;
const BALL_FRAG = /* glsl */`
varying vec3 vColor; varying float vA;
void main() {
  float r = length(gl_PointCoord - 0.5) * 2.0; if (r > 1.0) discard;
  float core = smoothstep(0.42, 0.34, r), halo = smoothstep(1.0, 0.3, r) * 0.55;
  vec3 metal = mix(vec3(0.55, 0.58, 0.64), vec3(1.0), smoothstep(0.35, 0.0, length(gl_PointCoord - vec2(0.42, 0.4))));
  vec3 col = mix(vColor, metal, core); float a = max(core, halo) * vA; if (a < 0.01) discard;
  gl_FragColor = vec4(col, a);
  #include <colorspace_fragment>
}`;

/** CPU twin of nmHidden for flags and picking. far = the shared uniforms; pw = [x, y, z] world. */
export function hiddenByEarth(far, pw) {
  const hx = far.uHead.value, o = far.uOC.value, dx = pw[0] - hx.x, dy = pw[1] - hx.y, dz = pw[2] - hx.z, dist = Math.hypot(dx, dy, dz);
  if (dist < 1e-4) return false;
  const rx = dx / dist, ry = dy / dist, rz = dz / dist, b = o.x * rx + o.y * ry + o.z * rz, disc = b * b - far.uOC2mR2.value;
  if (disc <= 0) return false;
  const t = -b - Math.sqrt(disc);
  return t > 0 && t < dist - (0.002 * dist + far.uTol.value);
}



/** One ribbon mesh over a growing buffer of segments (up to maxPts points). */
export class Ribbon {
  constructor(THREE, far, { maxPts = 4096, color = "#fff", opacity = 0.95, deg = C.trailDeg, minPx = 2.2, tailFade = 1, dash = 0, order = 10 } = {}) {
    this.THREE = THREE; this.maxPts = maxPts; this.nSeg = 0;
    const nv = (maxPts - 1) * 4;
    this.pos = new Float32Array(nv * 3); this.oth = new Float32Array(nv * 3); this.side = new Float32Array(nv); this.t = new Float32Array(nv);
    const idx = new Uint32Array((maxPts - 1) * 6); for (let i = 0; i < maxPts - 1; i++) { const o = i * 4; idx.set([o, o + 1, o + 2, o + 1, o + 3, o + 2], i * 6); }
    for (let i = 0; i < nv; i++) this.side[i] = i % 2 === 0 ? 1 : -1;
    const g = new THREE.BufferGeometry();
    this.attrs = { position: new THREE.BufferAttribute(this.pos, 3), aOther: new THREE.BufferAttribute(this.oth, 3), aSide: new THREE.BufferAttribute(this.side, 1), aT: new THREE.BufferAttribute(this.t, 1) };
    for (const [k, a] of Object.entries(this.attrs)) { a.setUsage(THREE.DynamicDrawUsage); g.setAttribute(k, a); }
    g.setIndex(new THREE.BufferAttribute(idx, 1)); g.setDrawRange(0, 0); g.boundingSphere = new THREE.Sphere(new THREE.Vector3(), 1e12);
    this.mat = new THREE.ShaderMaterial({ transparent: true, depthWrite: false, depthTest: true, side: THREE.DoubleSide,
      uniforms: { ...far, uColor: { value: new THREE.Color(color) }, uOpacity: { value: opacity }, uDeg: { value: deg }, uMinPx: { value: minPx }, uDash: { value: dash }, uTailFade: { value: tailFade } },
      vertexShader: NM_OCCLUDE + RIBBON_VERT, fragmentShader: NM_OCCLUDE + RIBBON_FRAG });
    this.mesh = new THREE.Mesh(g, this.mat); this.mesh.frustumCulled = false; this.mesh.renderOrder = order; this.geo = g;
    this.rel = new Float32Array(maxPts * 3); this.nPts = 0;
  }
  /** Replace all points. rel: flat float32-relative xyz (3 per point). */
  setPoints(rel, n) {
    this.nPts = n; this.rel.set(rel.subarray(0, 3 * n)); this.nSeg = Math.max(0, n - 1);
    for (let i = 0; i < this.nSeg; i++) this.writeSeg(i, n);
    this.commit(0, this.nSeg);
  }
  writeSeg(i, n) {
    const r = this.rel, a = 3 * i, b = 3 * (i + 1), o = i * 4, tA = n > 1 ? i / (n - 1) : 0, tB = n > 1 ? (i + 1) / (n - 1) : 0;
    for (let k = 0; k < 4; k++) {
      const endB = k >= 2, s = endB ? b : a, e = endB ? a : b, v = (o + k) * 3;
      this.pos[v] = r[s]; this.pos[v + 1] = r[s + 1]; this.pos[v + 2] = r[s + 2]; this.oth[v] = r[e]; this.oth[v + 1] = r[e + 1]; this.oth[v + 2] = r[e + 2];
      this.t[o + k] = endB ? tB : tA;
    }
  }
  appendPoint(x, y, z) {
    const i = this.nPts; if (i >= this.maxPts) return false;
    this.rel[3 * i] = x; this.rel[3 * i + 1] = y; this.rel[3 * i + 2] = z; this.nPts++;
    if (i > 0) { this.nSeg = i; this.writeSeg(i - 1, this.nPts); this.commit(i - 1, 1); } return true;
  }
  commit(seg0, count) {
    for (const k of Object.keys(this.attrs)) { const a = this.attrs[k], sz = a.itemSize; a.clearUpdateRanges(); a.addUpdateRange(seg0 * 4 * sz, count * 4 * sz); a.needsUpdate = true; }
    this.geo.setDrawRange(0, this.nSeg * 6);
  }
  dispose() { this.geo.dispose(); this.mat.dispose(); }
}

/** All the visuals for the fired shots. */
export class ShotViz {
  constructor(THREE, far, scene) {
    this.THREE = THREE; this.far = far; this.scene = scene; this.items = new Map(); this.root = new THREE.Group(); this.root.matrixAutoUpdate = true; scene.add(this.root);
    // balls: one Points object, one vertex per shot slot
    const N = C.maxShots, g = new THREE.BufferGeometry();
    this.ballPos = new Float32Array(N * 3); this.ballCol = new Float32Array(N * 3); this.ballAlive = new Float32Array(N);
    g.setAttribute("position", new THREE.BufferAttribute(this.ballPos, 3)); g.setAttribute("aColor", new THREE.BufferAttribute(this.ballCol, 3)); g.setAttribute("aAlive", new THREE.BufferAttribute(this.ballAlive, 1));
    g.boundingSphere = new THREE.Sphere(new THREE.Vector3(), 1e12);
    this.ballMat = new THREE.ShaderMaterial({ transparent: true, depthWrite: false, depthTest: true, uniforms: { ...far, uMinDeg: { value: C.ballMinDeg }, uRadius: { value: C.ball.diameterM / 2 } }, vertexShader: NM_OCCLUDE + BALL_VERT, fragmentShader: BALL_FRAG });
    this.balls = new THREE.Points(g, this.ballMat); this.balls.frustumCulled = false; this.balls.renderOrder = 11; this.root.add(this.balls); this.ballGeo = g;
    this.frame = null; this.R = 0; this.h = 0; this.slots = [];
  }
  /** Mesh matrix for a frame: translation to the muzzle (Mountain) or Earth centre (Model), scaled for Model. */
  placeRoot(frame) {
    const T = this.THREE; this.frame = frame;
    if (frame.kind === "mountain") {
      this.matrix = new T.Matrix4().makeTranslation(...frame.muzzle); // relative coords are already world-axis aligned
    } else this.matrix = new T.Matrix4().makeTranslation(...frame.earthCentre).multiply(new T.Matrix4().makeScale(frame.scale, frame.scale, frame.scale));
    for (const it of this.items.values()) it.ribbon.mesh.matrixAutoUpdate = false, it.ribbon.mesh.matrix.copy(this.matrix);
    this.balls.matrixAutoUpdate = false; this.balls.matrix.copy(this.matrix);
  }
  // In Model view the relative coordinates are in sim metres (the matrix scales them); in Mountain view they are metres in world axes.
  rel(x, y) { return toGpuRelative(this.frame, this.R, this.h, x, y); }
  worldOf(x, y) { return simToWorld(this.frame, this.R, this.h, x, y); }
  setFrame(frame, R, h) { this.R = R; this.h = h; this.placeRoot(frame); for (const it of this.items.values()) this.rebuild(it); }
  add(n, shot, colorHex, label) {
    const T = this.THREE, ribbon = new Ribbon(T, this.far, { color: colorHex }); ribbon.mesh.matrixAutoUpdate = false; ribbon.mesh.matrix.copy(this.matrix); this.scene.add(ribbon.mesh);
    const buf = new TrailBuffer(); buf.push(shot.x, shot.y, true);
    const slot = this.slots.indexOf(null) >= 0 ? this.slots.indexOf(null) : this.slots.length; this.slots[slot] = n;
    const c = new T.Color(colorHex); this.ballCol.set([c.r, c.g, c.b], slot * 3); this.ballAlive[slot] = 1; this.ballGeo.attributes.aColor.needsUpdate = true;
    const tag = textSprite(T, String(n), { w: 160, h: 96, font: 62 }); tag.scale.set(0.045, 0.027, 1); tag.visible = false; this.scene.add(tag);
    const it = { n, ribbon, buf, slot, color: colorHex, flag: null, tag, shot, landed: false, label }; this.items.set(n, it);
    const r = this.rel(shot.x, shot.y); ribbon.appendPoint(r[0], r[1], r[2]); return it;
  }
  rebuild(it) {
    const n = it.buf.n, rel = new Float32Array(3 * n);
    for (let i = 0; i < n; i++) { const r = this.rel(it.buf.x(i), it.buf.y(i)); rel[3 * i] = r[0]; rel[3 * i + 1] = r[1]; rel[3 * i + 2] = r[2]; }
    it.ribbon.setPoints(rel, n);
  }
  record(it, x, y, force = false) {
    const res = it.buf.push(x, y, force);
    if (res === "append") { const r = this.rel(x, y); it.ribbon.appendPoint(r[0], r[1], r[2]); } else if (res === "rebuild") this.rebuild(it);
  }
  land(it, flagText, x, y) {
    const T = this.THREE; it.landed = true; this.ballAlive[it.slot] = 0; this.ballGeo.attributes.aAlive.needsUpdate = true;
    if (!it.flag) { it.flag = textSprite(T, flagText, { w: 760, h: 112, font: 52 }); it.flag.scale.set(0.3, 0.0442, 1); this.scene.add(it.flag); }
    else it.flag.userData.set(flagText); it.flagSim = [x, y]; it.flag.visible = true;
  }
  retire(it) { it.landed = true; this.ballAlive[it.slot] = 0; this.ballGeo.attributes.aAlive.needsUpdate = true; }
  setBall(it, x, y) { const r = this.rel(x, y); this.ballPos.set(r, it.slot * 3); this.ballGeo.attributes.position.needsUpdate = true; }
  /** Per frame: place flags and number tags, hide those behind the Earth. */
  updateLabels(hiddenFn) {
    for (const it of this.items.values()) {
      if (it.flag && it.flagSim) { const w = this.worldOf(...it.flagSim); it.flag.position.set(...w); it.flag.visible = !hiddenFn(w); it.flagWorld = w; }
      const showTag = !it.landed; it.tag.visible = false;
      if (showTag) { const w = this.worldOf(it.shot.x, it.shot.y); it.tag.position.set(...w); it.tag.visible = !hiddenFn(w); }
    }
  }
  remove(n) {
    const it = this.items.get(n); if (!it) return;
    this.scene.remove(it.ribbon.mesh); it.ribbon.dispose(); this.ballAlive[it.slot] = 0; this.slots[it.slot] = null; this.ballGeo.attributes.aAlive.needsUpdate = true;
    if (it.flag) { this.scene.remove(it.flag); it.flag.material.map.dispose(); it.flag.material.dispose(); }
    this.scene.remove(it.tag); it.tag.material.map.dispose(); it.tag.material.dispose(); this.items.delete(n);
  }
  clear() { for (const n of [...this.items.keys()]) this.remove(n); this.slots = []; }
  setTrailVisible(on) { for (const it of this.items.values()) it.ribbon.mesh.visible = on; }
  highlight(n) { for (const it of this.items.values()) { it.ribbon.mat.uniforms.uDeg.value = it.n === n ? C.trailDeg * 1.7 : C.trailDeg; it.ribbon.mat.uniforms.uOpacity.value = n == null || it.n === n ? 0.95 : 0.6; } }
}

/** Fixed-angular-size arrow with a label, drawn at a world position along a world direction. */
export class ArrowViz {
  constructor(THREE, far, scene, colorHex, labelColor) {
    this.THREE = THREE; this.ribbon = new Ribbon(THREE, far, { maxPts: 8, color: colorHex, opacity: 1, deg: 0.25, minPx: 2.4, tailFade: 0, order: 13 }); this.ribbon.mesh.visible = false; scene.add(this.ribbon.mesh);
    this.label = textSprite(THREE, " ", { w: 420, h: 96, font: 52, color: labelColor }); this.label.scale.set(0.07, 0.016, 1); this.label.visible = false; scene.add(this.label); this.text = null;
    this.mat = this.ribbon.mesh; this.mat.matrixAutoUpdate = false; this.mat.matrix.identity(); this.lastLabel = "";
  }
  /** pos, dir: world [x,y,z] (dir need not be unit); angDeg: arrow length as an angle seen from the eye */
  set(pos, dir, eye, angDeg, text) {
    const d = Math.hypot(dir[0], dir[1], dir[2]) || 1, ux = dir[0] / d, uy = dir[1] / d, uz = dir[2] / d, dist = Math.hypot(pos[0] - eye[0], pos[1] - eye[1], pos[2] - eye[2]), L = Math.tan(angDeg * Math.PI / 180) * dist;
    const tip = [pos[0] + ux * L, pos[1] + uy * L, pos[2] + uz * L];
    // barbs: two short back-swept strokes in the plane of the arrow and the view direction
    const vx = pos[0] - eye[0], vy = pos[1] - eye[1], vz = pos[2] - eye[2], vl = Math.hypot(vx, vy, vz) || 1;
    let sx = uy * vz / vl - uz * vy / vl, sy = uz * vx / vl - ux * vz / vl, sz = ux * vy / vl - uy * vx / vl; const sl = Math.hypot(sx, sy, sz) || 1; sx /= sl; sy /= sl; sz /= sl;
    const b = L * 0.28, back = [tip[0] - ux * b, tip[1] - uy * b, tip[2] - uz * b];
    const pts = [pos, tip, back, [back[0] + sx * b * 0.7, back[1] + sy * b * 0.7, back[2] + sz * b * 0.7], tip, [back[0] - sx * b * 0.7, back[1] - sy * b * 0.7, back[2] - sz * b * 0.7]];
    // strokes must not connect: draw as one polyline that retraces (tip to barb to tip to barb), which is visually the same
    const rel = new Float32Array(pts.length * 3); pts.forEach((p, i) => { rel[3 * i] = p[0]; rel[3 * i + 1] = p[1]; rel[3 * i + 2] = p[2]; });
    this.ribbon.setPoints(rel, pts.length); this.ribbon.mesh.visible = true;
    this.label.position.set(tip[0] + ux * L * 0.1, tip[1] + uy * L * 0.1 + L * 0.12, tip[2] + uz * L * 0.1); this.label.visible = !!text;
    if (text && text !== this.lastLabel) { this.label.userData.set(text); this.lastLabel = text; }
  }
  hide() { this.ribbon.mesh.visible = false; this.label.visible = false; }
}

export { textSprite };
