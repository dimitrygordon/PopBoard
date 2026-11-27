// Text in the scene: billboard label sets (constellation names, star names, cardinals, planet names) and the
// pick label card. Text never rolls: each quad's up is world up projected onto the view plane (design 6.4),
// with a fallback near the zenith/nadir.
const UP = [0, 1, 0];
const sub = (a, b) => [a[0] - b[0], a[1] - b[1], a[2] - b[2]];
const scale = (a, k) => [a[0] * k, a[1] * k, a[2] * k];
const dot = (a, b) => a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
const cross = (a, b) => [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]];
const norm = (a) => { const l = Math.hypot(a[0], a[1], a[2]) || 1; return [a[0] / l, a[1] / l, a[2] / l]; };

/** Upright basis for a quad at direction f (unit, away from viewer). fallbackUp is used near the zenith. */
export function uprightBasis(f, fallbackUp = [0, 0, -1]) {
  let up = sub(UP, scale(f, dot(UP, f)));
  if (Math.hypot(...up) < 0.05) up = sub(fallbackUp, scale(f, dot(fallbackUp, f)));
  up = norm(up);
  return { up, right: norm(cross(f, up)) };
}

/** Draw a set of (multi-line) labels into one canvas atlas. entries: [{ lines: [{ text, font, color }] }]. */
function buildAtlas(entries, pad = 6) {
  const cvs = document.createElement("canvas"); const g = cvs.getContext("2d");
  const meas = entries.map((e) => {
    let w = 0, h = 0; const ls = e.lines.map((l) => {
      const text = l.upper ? l.text.toUpperCase() : l.text;
      g.font = l.font; g.letterSpacing = (l.spacing || 0) + "px";
      const m = g.measureText(text); const lh = Math.ceil(parseFloat(/(\d+)px/.exec(l.font)[1]) * 1.2); w = Math.max(w, m.width + (l.spacing || 0)); h += lh; return { ...l, text, lh };
    });
    return { w: Math.ceil(w) + 2 * pad, h: h + 2 * pad, ls };
  });
  const W = 2048; let x = 0, y = 0, rowH = 0; const rects = [];
  for (const m of meas) { if (x + m.w > W) { x = 0; y += rowH; rowH = 0; } rects.push([x, y, m.w, m.h]); x += m.w; rowH = Math.max(rowH, m.h); }
  const H = Math.max(64, 1 << Math.ceil(Math.log2(y + rowH)));
  cvs.width = W; cvs.height = H;
  g.textAlign = "center"; g.textBaseline = "top";
  meas.forEach((m, i) => {
    const [rx, ry, rw] = rects[i]; let yy = ry + pad;
    for (const l of m.ls) {
      g.font = l.font; g.fillStyle = l.color; g.letterSpacing = (l.spacing || 0) + "px";
      g.shadowColor = l.shadow || "rgba(0,0,0,0.85)"; g.shadowBlur = l.blur ?? 6; g.fillText(l.text, rx + rw / 2 + (l.spacing || 0) / 2, yy + l.lh * 0.08); yy += l.lh;
    }
  });
  return { canvas: cvs, rects, W, H };
}

/** One draw call for many upright labels. TextBillboards.scale shrinks every label on small flat screens (1 in the headset). opts: { radius, capDeg (cap height of the reference font), refPx (reference font size),
 *  anchor: "center" | "right-of" | "below", offsetDeg }. Cap height of Inter is 0.727 em. */
export const PILL_PAD_X = 14, PILL_PAD_Y = 6, PILL_COLOR = 0x080a18, PILL_OPACITY = 0.55;
export function pillHalfExtents(hw, hh, k) { return { phw: hw + PILL_PAD_X * k, phh: hh + PILL_PAD_Y * k }; }

const PILL_VERT = /* glsl */`
attribute float aAspect;
varying vec2 vUv;
varying float vAspect;
void main() {
  vUv = uv;
  vAspect = aAspect;
  gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
}
`;
const PILL_FRAG = /* glsl */`
uniform vec3 uColor;
uniform float uOpacity;
varying vec2 vUv;
varying float vAspect;
void main() {
  vec2 p = vUv * 2.0 - 1.0;
  float aspect = max(vAspect, 1.0e-4);
  float rr = min(aspect, 1.0);
  vec2 q = abs(vec2(p.x * aspect, p.y));
  vec2 b = vec2(max(aspect - rr, 0.0), max(1.0 - rr, 0.0));
  float d = length(max(q - b, 0.0)) - rr;
  float aa = fwidth(d);
  float a = uOpacity * (1.0 - smoothstep(-aa, aa, d));
  if (a <= 0.004) discard;
  gl_FragColor = vec4(uColor, a);
  #include <colorspace_fragment>
}
`;

export class TextBillboards {
  constructor(THREE, entries, opts) {
    this.THREE = THREE; this.n = entries.length; this.opts = { radius: 880, capDeg: 2.5, refPx: 30, anchor: "center", offsetDeg: 0, ...opts };
    const at = buildAtlas(entries);
    this.sizes = at.rects.map((r) => [r[2], r[3]]);
    const tex = new THREE.CanvasTexture(at.canvas); tex.colorSpace = THREE.SRGBColorSpace; tex.anisotropy = 4; tex.generateMipmaps = true; tex.minFilter = THREE.LinearMipmapLinearFilter;
    const pos = new Float32Array(this.n * 12), uv = new Float32Array(this.n * 8), idx = [];
    at.rects.forEach(([x, y, w, h], i) => {
      const u0 = x / at.W, u1 = (x + w) / at.W, v0 = 1 - (y + h) / at.H, v1 = 1 - y / at.H;
      uv.set([u0, v0, u1, v0, u1, v1, u0, v1], i * 8);
      const b = i * 4; idx.push(b, b + 1, b + 2, b, b + 2, b + 3);
    });
    const g = new THREE.BufferGeometry();
    g.setAttribute("position", new THREE.BufferAttribute(pos, 3).setUsage(THREE.DynamicDrawUsage));
    g.setAttribute("uv", new THREE.BufferAttribute(uv, 2)); g.setIndex(idx);
    g.boundingSphere = new THREE.Sphere(new THREE.Vector3(), 2000);
    this.mesh = new THREE.Mesh(g, new THREE.MeshBasicMaterial({ map: tex, transparent: true, depthWrite: false, depthTest: true, side: THREE.DoubleSide, toneMapped: false }));
    this.mesh.frustumCulled = false; this.mesh.renderOrder = 20;
    // Dark name pills: a second slightly larger quad, rounded in the shader to a true pill (radius = height/2).
    // Shown in passthrough only; not baked into the atlas. Padding is 14 px horizontal, 6 px vertical.
    const pillPos = new Float32Array(this.n * 12);
    const pillUv = new Float32Array(this.n * 8), pillAspect = new Float32Array(this.n * 4);
    for (let i = 0; i < this.n; i++) pillUv.set([0, 0, 1, 0, 1, 1, 0, 1], i * 8);
    const pg = new THREE.BufferGeometry();
    pg.setAttribute("position", new THREE.BufferAttribute(pillPos, 3).setUsage(THREE.DynamicDrawUsage));
    pg.setAttribute("uv", new THREE.BufferAttribute(pillUv, 2));
    pg.setAttribute("aAspect", new THREE.BufferAttribute(pillAspect, 1).setUsage(THREE.DynamicDrawUsage));
    pg.setIndex(idx.slice());
    pg.boundingSphere = new THREE.Sphere(new THREE.Vector3(), 2000);
    const pillMat = new THREE.ShaderMaterial({
      uniforms: { uColor: { value: new THREE.Color(PILL_COLOR) }, uOpacity: { value: PILL_OPACITY } },
      vertexShader: PILL_VERT, fragmentShader: PILL_FRAG,
      transparent: true, depthWrite: false, depthTest: true, side: THREE.DoubleSide, toneMapped: false,
    });
    this.pill = new THREE.Mesh(pg, pillMat);
    this.pill.frustumCulled = false; this.pill.renderOrder = 19; this.pill.visible = false;
    this.mesh.add(this.pill);
    this.pxPerDeg = 0.727 * this.opts.refPx / this.opts.capDeg; // atlas pixels per degree of sky
  }
  /** dirs: array of local-frame unit vectors (or null to hide). */
  update(dirs, fallbackUp) {
    const p = this.mesh.geometry.attributes.position, a = p.array, R = this.opts.radius;
    const pp = this.pill.geometry.attributes.position, pa = pp.array;
    const paA = this.pill.geometry.attributes.aAspect, aspects = paA.array;
    const showPill = !!TextBillboards.pill;
    this.pill.visible = showPill;
    for (let i = 0; i < this.n; i++) {
      const d = dirs[i];
      if (!d) { a.fill(0, i * 12, i * 12 + 12); pa.fill(0, i * 12, i * 12 + 12); aspects.fill(1, i * 4, i * 4 + 4); continue; }
      const { up, right } = uprightBasis(d, fallbackUp);
      const [w, h] = this.sizes[i];
      const k = R * Math.PI / 180 / this.pxPerDeg * TextBillboards.scale; // metres per atlas pixel at radius R
      const hw = w * k / 2, hh = h * k / 2;
      let c = scale(d, R);
      if (this.opts.anchor === "below") { const off = this.opts.offsetDeg * R * Math.PI / 180; c = [c[0] - up[0] * (hh + off), c[1] - up[1] * (hh + off), c[2] - up[2] * (hh + off)]; }
      if (this.opts.anchor === "right-of") { const off = this.opts.offsetDeg * R * Math.PI / 180; c = [c[0] + right[0] * (hw + off), c[1] + right[1] * (hw + off), c[2] + right[2] * (hw + off)]; }
      const corners = [[-hw, -hh], [hw, -hh], [hw, hh], [-hw, hh]];
      corners.forEach(([x, y], j) => { a[i * 12 + j * 3] = c[0] + right[0] * x + up[0] * y; a[i * 12 + j * 3 + 1] = c[1] + right[1] * x + up[1] * y; a[i * 12 + j * 3 + 2] = c[2] + right[2] * x + up[2] * y; });
      if (showPill) {
        const { phw, phh } = pillHalfExtents(hw, hh, k);
        const pc = [[-phw, -phh], [phw, -phh], [phw, phh], [-phw, phh]];
        pc.forEach(([x, y], j) => { pa[i * 12 + j * 3] = c[0] + right[0] * x + up[0] * y; pa[i * 12 + j * 3 + 1] = c[1] + right[1] * x + up[1] * y; pa[i * 12 + j * 3 + 2] = c[2] + right[2] * x + up[2] * y; });
        const aspect = phh > 0 ? phw / phh : 1;
        aspects.fill(aspect, i * 4, i * 4 + 4);
      } else { pa.fill(0, i * 12, i * 12 + 12); aspects.fill(1, i * 4, i * 4 + 4); }
    }
    p.needsUpdate = true; pp.needsUpdate = true; paA.needsUpdate = true;
  }
  dispose() { this.mesh.geometry.dispose(); this.mesh.material.map.dispose(); this.mesh.material.dispose(); this.pill.geometry.dispose(); this.pill.material.dispose(); }
}

/** The pick label card (used in VR; the desktop page shows an HTML card instead). */
export class LabelCard {
  constructor(THREE, skin) {
    this.THREE = THREE; this.skin = skin.card; this.canvas = document.createElement("canvas"); this.canvas.width = 640; this.canvas.height = 320;
    this.tex = new THREE.CanvasTexture(this.canvas); this.tex.colorSpace = THREE.SRGBColorSpace;
    this.mesh = new THREE.Mesh(new THREE.PlaneGeometry(1, 0.5), new THREE.MeshBasicMaterial({ map: this.tex, transparent: true, depthTest: false, depthWrite: false, toneMapped: false }));
    this.mesh.renderOrder = 40; this.mesh.visible = false; this.mesh.frustumCulled = false;
  }
  show(info, dirLocal, radius = 700, widthDeg = 12) {
    const g = this.canvas.getContext("2d"), S = this.skin, W = 640, H = 320;
    g.clearRect(0, 0, W, H); g.fillStyle = S.bg; roundRect(g, 4, 4, W - 8, H - 8, 22); g.fill();
    g.fillStyle = S.fg; g.font = S.font; g.textBaseline = "top"; g.fillText(info.title, 28, 24);
    let y = 82;
    if (info.common) { g.font = S.small; g.fillStyle = S.fg; g.fillText(info.common, 28, 68); y = 104; }
    g.font = S.small; g.fillStyle = S.dim;
    info.lines.slice(0, 6).forEach((t, i) => g.fillText(t, 28, y + i * 32));
    // Close control (top right). Hit-tested in hit().
    g.fillStyle = S.dim; g.font = "600 36px Inter, system-ui, sans-serif"; g.textAlign = "center"; g.textBaseline = "middle";
    g.fillText("×", W - 36, 32); g.textAlign = "start"; g.textBaseline = "alphabetic";
    this.tex.needsUpdate = true;
    const { up, right } = uprightBasis(dirLocal);
    const w = radius * Math.tan(widthDeg * Math.PI / 180);
    const c = dirLocal.map((v, i) => v * radius + right[i] * w * 0.62 + up[i] * w * 0.1);
    this.mesh.position.set(c[0], c[1], c[2]);
    const T = this.THREE; this.mesh.quaternion.setFromRotationMatrix(new T.Matrix4().makeBasis(new T.Vector3(...right), new T.Vector3(...up), new T.Vector3(-dirLocal[0], -dirLocal[1], -dirLocal[2])));
    this.mesh.scale.set(w, w, 1); this.mesh.visible = true;
  }
  hide() { this.mesh.visible = false; }
  /** "close" if the ray hits the ×, "body" if it hits the rest of the card, else null. */
  hit(ray) {
    if (!this.mesh.visible) return null;
    const T = this.THREE;
    const rc = new T.Raycaster(ray.origin.clone ? ray.origin.clone() : new T.Vector3().copy(ray.origin), ray.dir.clone ? ray.dir.clone().normalize() : new T.Vector3().copy(ray.dir).normalize());
    const hits = rc.intersectObject(this.mesh, false);
    if (!hits.length) return null;
    const uv = hits[0].uv; if (!uv) return "body";
    const x = uv.x * 640, y = (1 - uv.y) * 320;
    return (x >= 640 - 70 && y <= 64) ? "close" : "body";
  }
}
export function roundRect(g, x, y, w, h, r) { g.beginPath(); g.moveTo(x + r, y); g.arcTo(x + w, y, x + w, y + h, r); g.arcTo(x + w, y + h, x, y + h, r); g.arcTo(x, y + h, x, y, r); g.arcTo(x, y, x + w, y, r); g.closePath(); }
TextBillboards.scale = 1;
