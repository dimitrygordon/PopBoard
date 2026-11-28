// Stellar Life Cycle VR: the painted 3D scenes. Each scene is a few merged stroke meshes (a handful of draw calls)
// plus a glow billboard, built lazily on first use and cached. Every size is to scale inside its scene; the
// scene's kmPerUnit drives the scale bar and the "Zoomed in / out N times" labels (never a fake scale).
import { buildSky, buildCloud, buildDisk, buildStar, buildShells, buildOnion, ONION, buildNebula, buildRemnant, buildEarth, buildEarth2, buildCity, buildPhotonRing, buildProminence, buildFlare, buildRSG, rsgCells, buildLensSources, spriteGeometry, lutData, tRGB255, hex2rgb, rng } from "./sl-strokes.js";
import { about } from "./sl-data.js";
import { paintGranulation, paintCity, GRAN_KM, CITY_M, CITY_ASPECT } from "./sl-loupes.js";
import { strokeVert, strokeFrag, spriteVert, spriteFrag, bgVert, bgFrag, glowVert, glowFrag, rsgVert, EVO, HASH } from "./sl-shaders.js";

export const KM = { RSUN: 695700, AU: 1.495978707e8, LY: 9.4607e12, REARTH: 6371 };
const LABEL_K = 1.9;   // labels read at about 2 to 3 percent of the view height on desktop and in the headset
const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
/* Kepler angular speed used by the disk shader (rad per s of motion time, r in AU) and the GLSL h11 hash, mirrored for the painter's sort and callouts */
const kep = (r) => 1.0 * Math.pow(Math.max(r, 0.3), -1.5);
const fr = (x) => x - Math.floor(x); const h11 = (p) => { p = fr(p * 0.1031); p *= p + 33.33; p *= p + p; return fr(p); };
const smooth = (a, b, x) => { const t = clamp((x - a) / (b - a), 0, 1); return t * t * (3 - 2 * t); };

export class Scenes {
  constructor(THREE, uni) {
    this.T = THREE; this.uni = uni; this.cache = {}; this.counts = {};
    const { data, N } = lutData(); this.lut = new THREE.DataTexture(data, N, 1, THREE.RGBAFormat); this.lut.magFilter = THREE.LinearFilter; this.lut.minFilter = THREE.LinearFilter; this.lut.needsUpdate = true;
    this.root = new THREE.Group();
    this.reduced = typeof matchMedia === "function" && matchMedia("(prefers-reduced-motion: reduce)").matches;
  }
  mat({ additive = false, star = false, own = {}, crisp = 0, grow = false } = {}) {
    const T = this.T;
    const u = { ...this.uni, uCrisp: { value: crisp }, uGrow: { value: 1 }, uAlpha: { value: 1 }, uLut: { value: this.lut }, uTeff: { value: 5772 }, uExposure: { value: 1 }, uPeek: { value: new T.Vector3(1, 1, 1) }, uPeekOn: { value: 0 }, uChroma: { value: 0 }, uRise: { value: 1 }, uExp: { value: 0 }, uWind: { value: 0 }, uWindLen: { value: 0.6 }, uPull: { value: 1 }, uLayerA: { value: [1, 1, 1, 1, 1, 1, 1] }, ...own };
    const defines = {}; if (additive) defines.ADDITIVE = 1; if (star) defines.STAR = 1; if (grow) defines.GROW = 1;
    return new T.ShaderMaterial({ vertexShader: strokeVert, fragmentShader: strokeFrag, uniforms: u, defines, transparent: true, depthTest: false, depthWrite: false, side: T.DoubleSide,
      ...(additive ? { blending: T.CustomBlending, blendEquation: T.AddEquation, blendSrc: T.OneFactor, blendDst: T.OneFactor, blendSrcAlpha: T.OneFactor, blendDstAlpha: T.OneFactor } : { blending: T.NormalBlending, premultipliedAlpha: true }) });
  }
  mesh(builder, opts = {}, order = 1) { const m = new this.T.Mesh(builder.geometry(this.T), this.mat(opts)); m.frustumCulled = false; m.renderOrder = order; m.userData.strokes = builder.n; return m; }
  glow(layers, { disc = 0, useTeff = true, order = 3 } = {}) {
    const T = this.T; const maxR = Math.max(...layers.map((l) => l[0]), disc * 1.02);
    const lay = []; const rad = []; for (let i = 0; i < 5; i++) { const l = layers[i] || [1e-3, 0, [0, 0, 0]]; const c = l[2] || [255, 255, 255]; lay.push(new T.Vector4(c[0] / 255, c[1] / 255, c[2] / 255, l[1])); rad.push(l[0]); }
    const m = new T.Mesh(new T.PlaneGeometry(2, 2), new T.ShaderMaterial({ vertexShader: glowVert, fragmentShader: glowFrag,
      uniforms: { ...this.uni, uMaxR: { value: maxR }, uLay: { value: lay }, uRad: { value: rad }, uLut: { value: this.lut }, uTeff: { value: 5772 }, uDisc: { value: disc }, uExposure: { value: 1 }, uAlpha: { value: 1 }, uPeek: { value: new T.Vector3(1, 1, 1) }, uPeekOn: { value: 0 }, uChroma: { value: 0 }, uUseTeff: { value: useTeff ? 1 : 0 }, uRing: { value: new T.Vector4(1, 1, 1, 0) } },
      transparent: true, depthTest: false, depthWrite: false, side: T.DoubleSide, blending: T.NormalBlending, premultipliedAlpha: true }));
    m.frustumCulled = false; m.renderOrder = order; return m;
  }
  sprites(list, order = 6) {
    const T = this.T; const m = new T.Mesh(spriteGeometry(T, list), new T.ShaderMaterial({ vertexShader: spriteVert, fragmentShader: spriteFrag, uniforms: { ...this.uni, uAlpha: { value: 1 }, uKepler: { value: 0 } }, transparent: true, depthTest: false, depthWrite: false, side: T.DoubleSide,
      blending: T.CustomBlending, blendEquation: T.AddEquation, blendSrc: T.OneFactor, blendDst: T.OneFactor, blendSrcAlpha: T.OneFactor, blendDstAlpha: T.OneFactor }));
    m.frustumCulled = false; m.renderOrder = order; return m;
  }
  // text label as a camera-facing sprite (world-sized so it scales with the scene); redraw only when the text changes
  label(text, { size = 3, color = "#FFFFFF", sub = "", plate = true, align = "center" } = {}) {
    const T = this.T; const c = document.createElement("canvas"); c.width = 1024; c.height = 256;
    const tex = new T.CanvasTexture(c); tex.colorSpace = T.SRGBColorSpace; tex.minFilter = T.LinearFilter; tex.generateMipmaps = false;
    const sp = new T.Sprite(new T.SpriteMaterial({ map: tex, transparent: true, depthTest: false, depthWrite: false, toneMapped: false }));
    sp.renderOrder = 40; sp.center.set(0.5, 0.5); sp.userData = { c, tex, text: null, size, color, plate, align, label: true, clamp: align !== "center" };
    this.setLabel(sp, text, sub); return sp;
  }
  setLabel(sp, text, sub = "") {
    const d = sp.userData; const key = text + "|" + sub; if (d.text === key) return; d.text = key;
    const g = d.c.getContext("2d"); g.clearRect(0, 0, 1024, 256); if (!text) { sp.visible = false; d.tex.needsUpdate = true; return; } sp.visible = true;
    const lines = sub ? sub.split("\n") : [];   /* a long sub may be two lines (Tesla captions) so the words stay at their natural size */
    g.font = "650 76px Inter, -apple-system, system-ui, sans-serif"; const w1 = g.measureText(text).width; g.font = "500 58px Inter, -apple-system, system-ui, sans-serif"; const w2 = lines.reduce((m, t) => Math.max(m, g.measureText(t).width), 0);
    const w = Math.min(1000, Math.max(w1, w2) + 60), h = lines.length > 1 ? 248 : (sub ? 190 : 116), x0 = (1024 - w) / 2, y0 = (256 - h) / 2; d.ph = h / 256;
    if (d.plate) { g.fillStyle = "rgba(8,10,24,0.62)"; g.beginPath(); g.roundRect ? g.roundRect(x0, y0, w, h, 40) : g.rect(x0, y0, w, h); g.fill(); }
    g.textAlign = "center"; g.fillStyle = d.color; g.font = "650 76px Inter, -apple-system, system-ui, sans-serif"; g.fillText(text, 512, y0 + (lines.length > 1 ? 76 : 84), 980);
    if (lines.length) { g.fillStyle = "#C3C9E6"; g.font = "500 58px Inter, -apple-system, system-ui, sans-serif"; lines.forEach((t, i) => g.fillText(t, 512, y0 + (lines.length > 1 ? 140 : 156) + i * 64, 980)); }
    d.tex.needsUpdate = true; sp.scale.set(d.size * 4 * LABEL_K, d.size * LABEL_K, 1); d.base = [sp.scale.x, sp.scale.y]; d.k = 1;
    // left or right aligned labels hang off a leader line: the plate's near edge sits at the sprite position
    d.x0 = x0 / 1024; d.x1 = (x0 + w) / 1024; sp.center.set(d.align === "left" ? d.x0 : d.align === "right" ? d.x1 : 0.5, 0.5);
  }
  /** A label with a leader line to an anchor (style B frames): place(anchor, dx, dy) puts the label dx, dy (world units,
   * along the camera's right and up) from the anchor and draws the line to the plate's near edge, with a dot on the anchor. */
  /** Leader lines and dots for a group of callouts drawn in two calls in all (one LineSegments, one Points) instead of two per callout. */
  calloutSet(max) {
    const T = this.T; const grp = new T.Group(); const lp = new Float32Array(max * 6), dp = new Float32Array(max * 3);
    const lg = new T.BufferGeometry(); lg.setAttribute("position", new T.BufferAttribute(lp, 3)); const dg = new T.BufferGeometry(); dg.setAttribute("position", new T.BufferAttribute(dp, 3));
    const lines = new T.LineSegments(lg, new T.LineBasicMaterial({ color: 0xE6E9F8, transparent: true, opacity: 0.75, depthTest: false, depthWrite: false })); lines.renderOrder = 39; lines.frustumCulled = false;
    const c = document.createElement("canvas"); c.width = c.height = 32; const g2 = c.getContext("2d"); g2.fillStyle = "#fff"; g2.beginPath(); g2.arc(16, 16, 15, 0, Math.PI * 2); g2.fill();
    const dots = new T.Points(dg, new T.PointsMaterial({ color: 0xFFFFFF, size: 7 * (window.devicePixelRatio || 1), sizeAttenuation: false, map: new T.CanvasTexture(c), alphaTest: 0.5, transparent: true, opacity: 0.9, depthTest: false, depthWrite: false })); dots.renderOrder = 39; dots.frustumCulled = false;
    grp.add(lines, dots); const set = { grp, n: 0, line: lg.attributes.position,
      begin() { set.n = 0; },
      push(a, b) { const i = set.n++; lg.attributes.position.setXYZ(2 * i, a.x, a.y, a.z); lg.attributes.position.setXYZ(2 * i + 1, b.x, b.y, b.z); dg.attributes.position.setXYZ(i, a.x, a.y, a.z); return 2 * i + 1; },
      flush() { lg.setDrawRange(0, 2 * set.n); dg.setDrawRange(0, set.n); lg.attributes.position.needsUpdate = dg.attributes.position.needsUpdate = true; } };
    return set;
  }
  callout(text, { sub = "", size = 1.6, color = "#FFFFFF", side = 1, set = null } = {}) {
    const T = this.T; const grp = new T.Group(); const lab = this.label(text, { sub, size, color, align: side > 0 ? "left" : "right" });
    if (set) { const co = { grp, lab, side, text, sub, set: (t, sb = "") => this.setLabel(lab, t, sb),
      place: (anchor, dx, dy, q) => { const rt = new T.Vector3(1, 0, 0).applyQuaternion(q), up = new T.Vector3(0, 1, 0).applyQuaternion(q); const end = anchor.clone().addScaledVector(rt, dx).addScaledVector(up, dy); lab.position.copy(end);
        if (lab.visible) { lab.userData.line = set.line; lab.userData.lineIdx = set.push(anchor, end); } else lab.userData.line = null; } }; grp.add(lab); this.setLabel(lab, text, sub); return co; }
    const geo = new T.BufferGeometry().setFromPoints([new T.Vector3(), new T.Vector3(1, 0, 0)]); const line = new T.Line(geo, new T.LineBasicMaterial({ color: 0xE6E9F8, transparent: true, opacity: 0.75, depthTest: false, depthWrite: false })); line.renderOrder = 39; line.frustumCulled = false;
    const dot = new T.Mesh(new T.CircleGeometry(1, 16), new T.MeshBasicMaterial({ color: 0xFFFFFF, transparent: true, opacity: 0.9, depthTest: false, depthWrite: false })); dot.renderOrder = 39;
    grp.add(lab, line, dot); const co = { grp, lab, line, dot, side, text, sub,
      set: (t, sb = "") => this.setLabel(lab, t, sb),
      place: (anchor, dx, dy, q, dotR = 0.25) => {
        const rt = new T.Vector3(1, 0, 0).applyQuaternion(q), up = new T.Vector3(0, 1, 0).applyQuaternion(q);
        const end = anchor.clone().addScaledVector(rt, dx).addScaledVector(up, dy); lab.position.copy(end);
        const pa = line.geometry.attributes.position; lab.userData.line = pa; pa.setXYZ(0, anchor.x, anchor.y, anchor.z); pa.setXYZ(1, end.x, end.y, end.z); pa.needsUpdate = true;
        dot.position.copy(anchor); dot.quaternion.copy(q); dot.scale.setScalar(dotR); line.visible = dot.visible = lab.visible; } };
    this.setLabel(lab, text, sub); return co;
  }
  /** A close-up inset (style B loupe): a framed plate with its own scale bar and a title chip, joined to the spot it magnifies by two
   * thin dashed lines. Plate width and bar length are exact: update() gets the plate width in scene units from the caller, which
   * derives it from the scene's km per unit and the stated magnification, so "50 times closer" is the real ratio. */
  loupe({ title, note = "", noteSub = "", note2 = "", aspect = 1, paint, live = false, barLabel, barFrac, side = 1 }) {
    const T = this.T; const grp = new T.Group();
    /* round 6: the picture is painted at full size (640 px, or 840 px wide for the city) and drawn into a plate styled like the UI panels:
       rounded corners at the panel radius (18 px on a plate about 180 px wide), a frosted navy border and a thin light frame */
    const pic = document.createElement("canvas"); pic.width = aspect < 1 ? 840 : 640; pic.height = Math.round(pic.width * aspect); if (!live) paint(pic);   /* live: the picture is drawn by a shader (granulation that evolves) */
    const w = pic.width, h = pic.height, bp = Math.round(w * 0.035), cv = document.createElement("canvas"); cv.width = w + 2 * bp; cv.height = h + 2 * bp;
    const g2 = cv.getContext("2d"), rad = Math.round(cv.width * 0.1), rr = (x, y, ww, hh, r) => { g2.beginPath(); g2.roundRect(x, y, ww, hh, r); };
    const hair = Math.max(2, Math.round(w * 0.004));
    rr(hair / 2, hair / 2, cv.width - hair, cv.height - hair, rad); g2.fillStyle = "rgba(14,18,44,0.80)"; g2.fill(); g2.lineWidth = hair; g2.strokeStyle = "rgba(255,255,255,0.30)"; g2.stroke();
    g2.save(); rr(bp, bp, w, h, rad - bp); g2.clip(); if (live) g2.clearRect(bp, bp, w, h); else g2.drawImage(pic, bp, bp);
    /* the scale bar is painted into the picture (barFrac is the bar's share of the picture width), so the inset is one draw call */
    const tk = Math.max(3, w * 0.012), bx = bp + w * 0.08, by = bp + h * 0.83; g2.fillStyle = "#FFFFFF"; g2.fillRect(bx, by - tk / 2, w * barFrac, tk); g2.fillRect(bx - tk / 2, by - tk * 2.5, tk, tk * 5); g2.fillRect(bx + w * barFrac - tk / 2, by - tk * 2.5, tk, tk * 5);
    g2.restore(); rr(bp, bp, w, h, rad - bp); g2.lineWidth = hair; g2.strokeStyle = "rgba(185,195,234,0.75)"; g2.stroke();
    const fx = cv.width / w, fy = cv.height / h;   /* the plate's size over the picture's size */
    const tex = new T.CanvasTexture(cv); tex.colorSpace = T.SRGBColorSpace; tex.generateMipmaps = true; tex.minFilter = T.LinearMipmapLinearFilter; tex.magFilter = T.LinearFilter; tex.anisotropy = 4;
    let pmat; if (!live) pmat = new T.MeshBasicMaterial({ map: tex, transparent: true, depthTest: false, depthWrite: false, toneMapped: false });
    else { tex.colorSpace = T.NoColorSpace;   /* raw sRGB bytes in, raw sRGB out, like the painted plate */
      pmat = new T.ShaderMaterial({ uniforms: { uMap: { value: tex }, uFlowT: this.uni.uFlowT, uRect: { value: new T.Vector4(bp, bp, w, h) }, uSize: { value: new T.Vector2(cv.width, cv.height) }, uRad: { value: rad - bp } },
        transparent: true, depthTest: false, depthWrite: false,
        vertexShader: "varying vec2 vU; void main(){ vU = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }",
        fragmentShader: `precision highp float; varying vec2 vU; uniform sampler2D uMap; uniform float uFlowT; uniform vec4 uRect; uniform vec2 uSize; uniform float uRad;
${HASH}
${EVO}
void main(){
  vec4 t = texture2D(uMap, vU); vec2 px = vec2(vU.x, 1.0 - vU.y) * uSize;   /* canvas pixels from the top left */
  vec2 q = px - uRect.xy - uRect.zw * 0.5, hb = uRect.zw * 0.5 - uRad; float sd = length(max(abs(q) - hb, 0.0)) - uRad;   /* rounded picture rect */
  if (sd > 0.0) { if (t.a < 0.003) discard; gl_FragColor = t; return; }
  vec2 g = (px - uRect.xy) / uRect.z * 9.0; float cb; float gap = evoCells(g, uFlowT, cb); float fw = fwidth(gap);
  float lane = 1.0 - smoothstep(0.1 - fw, 0.1 + fw, gap), rim = (1.0 - smoothstep(0.1, 0.3, gap)) * (1.0 - lane), inner = smoothstep(0.1, 0.9, gap);
  float mo = (vn(g * 3.1) - 0.5) * 0.06 + (vn(g * 7.3 + 3.3) - 0.5) * 0.04;
  vec3 col = vec3(245.0, 227.0, 214.0) / 255.0 * (0.955 + 0.045 * inner + mo) * cb / 0.95;   /* cells about F5E3D6 */
  col = mix(col, vec3(236.0, 196.0, 160.0) / 255.0, rim * 0.55); col = mix(col, vec3(191.0, 159.0, 125.0) / 255.0, lane);   /* warm rim, lanes about BF9F7D */
  col = mix(col, t.rgb, t.a); gl_FragColor = vec4(col, 1.0);
}` }); }
    const plate = new T.Mesh(new T.PlaneGeometry(1, 1), pmat); plate.renderOrder = 37; plate.frustumCulled = false;
    const lines = new T.LineSegments(new T.BufferGeometry().setFromPoints([new T.Vector3(), new T.Vector3(1, 0, 0), new T.Vector3(), new T.Vector3(1, 0, 0)]), new T.LineDashedMaterial({ color: 0xE6E9F8, transparent: true, opacity: 0.8, dashSize: 1, gapSize: 1, depthTest: false, depthWrite: false })); lines.renderOrder = 35; lines.frustumCulled = false;
    const chip = this.label(title, { size: 1.0, color: "#FFFFFF", align: "left" }), nt = note ? this.label(note, { sub: noteSub, size: 0.9, plate: false, align: "left" }) : null;
    const nt2 = note2 ? this.label(note2, { size: 0.8, color: "#C3C9E6", plate: false, align: "left" }) : null; const bl = this.label(barLabel, { size: 0.8 }); bl.userData.minPx = 14; chip.userData.minPx = 20;
    if (nt) nt.userData.minPx = 19; if (nt2) nt2.userData.minPx = 16; for (const l of [chip, nt, nt2]) if (l) l.userData.clamp = false;   /* the inset's texts stay together; the caller places the whole inset clear of the cards */
    grp.add(plate, lines, chip, bl); if (nt) grp.add(nt); if (nt2) grp.add(nt2);
    const rt = new T.Vector3(), up = new T.Vector3(), P = (c, x, y) => c.clone().addScaledVector(rt, x).addScaledVector(up, y);
    return { grp, plate, chip, nt, nt2, bl,
      /** centre: plate centre; W: plate width in scene units; anchor: the spot it magnifies; show: visibility */
      update(q, centre, W, anchor, show) {
        grp.visible = show; if (!show) return; rt.set(1, 0, 0).applyQuaternion(q); up.set(0, 1, 0).applyQuaternion(q); const H = W * aspect;
        plate.quaternion.copy(q); plate.position.copy(centre); plate.scale.set(W * fx, H * fy, 1); const Wo = W * fx, Ho = H * fy;
        bl.position.copy(P(centre, -W * 0.5 + W * 0.08 + W * barFrac / 2, -H * 0.5 + H * 0.17 + H * 0.13));
        const left = -Wo * 0.5; chip.position.copy(P(centre, left, Ho * 0.5 + chip.scale.y * (chip.userData.ph || 0.45) * 0.5 + W * 0.03));
        let yb = -Ho * 0.5 - W * 0.03; if (nt) { nt.position.copy(P(centre, left, yb - nt.scale.y * (nt.userData.ph || 0.45) * 0.5)); yb -= nt.scale.y * (nt.userData.ph || 0.45) + W * 0.01; }
        if (nt2) nt2.position.copy(P(centre, left, yb - nt2.scale.y * (nt2.userData.ph || 0.45) * 0.5));
        const sx = side > 0 ? 0.5 : -0.5, pa = lines.geometry.attributes.position, c1 = P(centre, sx * Wo, Ho * 0.42), c2 = P(centre, sx * Wo, -Ho * 0.42);
        pa.setXYZ(0, c1.x, c1.y, c1.z); pa.setXYZ(1, anchor.x, anchor.y, anchor.z); pa.setXYZ(2, c2.x, c2.y, c2.z); pa.setXYZ(3, anchor.x, anchor.y, anchor.z); pa.needsUpdate = true; lines.computeLineDistances();
        lines.material.dashSize = W * 0.035; lines.material.gapSize = W * 0.025;
      } };
  }
  dashedRing(radius, { color = 0xAACDFF, opacity = 0.8, seg = 128, dash = 0.06 } = {}) {
    const T = this.T; const pts = []; for (let i = 0; i <= seg; i++) { const a = i / seg * Math.PI * 2; pts.push(new T.Vector3(Math.cos(a) * radius, 0, -Math.sin(a) * radius)); }
    const g = new T.BufferGeometry().setFromPoints(pts); const l = new T.Line(g, new T.LineDashedMaterial({ color, transparent: true, opacity, dashSize: radius * dash * 2 * Math.PI / 6, gapSize: radius * dash * 2 * Math.PI / 8, depthTest: false, depthWrite: false }));
    l.computeLineDistances(); l.renderOrder = 30; l.frustumCulled = false; return l;
  }

  // ---------------- background: navy to violet gradient plus the painted sky (shared, static) ----------------
  background() {
    if (this.cache.bg) return this.cache.bg; const T = this.T; const g = new T.Group();
    const bg = new T.Mesh(new T.IcosahedronGeometry(2600, 3), new T.ShaderMaterial({ vertexShader: bgVert, fragmentShader: bgFrag, side: T.BackSide, depthTest: false, depthWrite: false }));
    bg.frustumCulled = false; bg.renderOrder = -2; const { sky, sprites } = buildSky(7);
    const sm = this.mesh(sky, {}, -1); const sp = this.sprites(sprites, -1);
    g.add(bg, sm, sp); this.counts.sky = sky.n; this.cache.bg = { root: g, strokes: sky.n, meshes: 3 }; return this.cache.bg;
  }

  // ---------------- F1, F2: cloud and collapse (units: 0.1 light-year) ----------------
  cloud() {
    if (this.cache.cloud) return this.cache.cloud; const T = this.T; const g = new T.Group();
    const { vis, ir, fil } = buildCloud(11);
    const mv = this.mesh(vis, {}, 2), mi = this.mesh(ir, { additive: true }, 2), mf = this.mesh(fil, { additive: true }, 3);
    g.add(mv, mi, mf);
    const sc = { root: g, kind: "cloud", centered: false, kmPerUnit: () => 0.1 * KM.LY, camDist: 80, radius: 30, strokes: vis.n + fil.n, meshes: 3, label: this.label("", { size: 3 }),
      update: (c) => {
        const collapse = c.v.stage && c.v.stage.id === "F2"; const t = c.v.t;
        mi.visible = !!c.st.toggles.ir || collapse; mv.visible = !mi.visible || collapse;
        mv.material.uniforms.uAlpha.value = collapse ? 1 - 0.5 * t : 1; mi.material.uniforms.uAlpha.value = collapse ? 0.5 + 0.5 * t : 1;
        const s = collapse ? 1 - 0.62 * smooth(0, 1, t) : 1; g.scale.setScalar(s);
        mf.visible = collapse; mf.material.uniforms.uPull.value = 1;
        this.setLabel(sc.label, collapse ? "Dense core collapsing" : c.st.toggles.ir ? "Infrared view" : "Visible light view", collapse ? "" : c.st.toggles.ir ? "the cold dust glows" : "the cloud blocks starlight");
        sc.label.position.set(0, 24 * s + 4, 0);
      } };
    g.add(sc.label); this.cache.cloud = sc; return sc;
  }

  // ---------------- F3 to F5: protostar, disk and jets, planets (units: AU) ----------------
  disk(mass) {
    const key = "disk" + mass; if (this.cache[key]) return this.cache[key]; const T = this.T; const g = new T.Group();
    const planets = mass === "1" ? "solar" : mass === "0.2" ? "reddwarf" : null; const massive = mass === "15" || mass === "40";
    const D = buildDisk({ teff: 4410, seed: 7, planets, wrap: massive });
    const md = this.mesh(D.disk, {}, 1), ma = this.mesh(D.add, {}, 2), mw = massive ? this.mesh(D.wrap, {}, 5) : null;   // jets and knots blend with alpha (v4)
    const core = this.glow(D.core.map((l) => [l[0], l[1]]), { useTeff: true, order: 3 });
    const sp = D.sprites.length ? this.sprites(D.sprites, 4) : null; if (sp) sp.material.uniforms.uKepler.value = 1;   /* the planets' glows orbit with the planets */
    g.add(md, ma, core); if (sp) g.add(sp); if (mw) g.add(mw);
    const frost = D.frost ? new T.Group() : null; if (frost) g.add(frost);   // the frost line is painted into the disk (v4); this group only carries the label
    /* style B (frame 1): the names sit beside the disk on side callouts with thin leader lines, not on top of it */
    const cset = this.calloutSet(5); g.add(cset.grp);
    const coT = this.callout("Protostar", { sub: "glows from squeezing, not fusion", size: 1.1, side: 1, set: cset });
    const coJ = this.callout("Jet along the spin axis", { size: 1.1, side: -1, set: cset });
    const rocky = D.bodies.filter((b) => b.kind === "rocky"), giant = D.bodies.filter((b) => b.kind === "giant");
    const pick = (arr, r) => arr.reduce((m, b) => (m == null || Math.abs(b.r - r) < Math.abs(m.r - r) ? b : m), null);
    const bR = pick(rocky, planets === "solar" ? 1.75 : 1.1), bG = giant.length ? pick(giant, 5.2) : null;
    const coR = bR ? this.callout("Rocky bodies", { sub: planets === "solar" ? "inside the frost line" : "close to the star", size: 1.1, side: -1, set: cset }) : null;
    const coG = bG ? this.callout("Gas giant cores", { sub: "outside the frost line", size: 1.1, side: 1, set: cset }) : null;
    const coF = D.frost ? this.callout("Frost line, about 3 AU", { sub: "ices freeze beyond it", size: 1.1, side: 1, set: cset }) : null;
    for (const co of [coT, coJ, coR, coG, coF]) if (co) g.add(co.grp);
    const vA = new T.Vector3(), frostA = new T.Vector3(D.frost ? D.frost * Math.cos(-0.9) : 0, 0, D.frost ? D.frost * Math.sin(-0.9) * -1 : 0);
    const coreHot = this.glow([[1.6, 0.9, [255, 255, 255]], [0.7, 1.0, [255, 255, 255]]], { useTeff: false, order: 7 }); coreHot.visible = false; g.add(coreHot);
    // painter's sort of the disk strokes, back to front (from the tech test)
    const dg = md.geometry, meta = dg.userData, nS = meta.count, per = meta.per;
    const cr = new Float32Array(nS); for (let i = 0; i < nS; i++) cr[i] = Math.hypot(meta.cent[3 * i], meta.cent[3 * i + 2]) + 1e-3;
    const idxAttr = dg.getIndex(), idxArr = idxAttr.array, baseIdx = meta.baseIndex; const keys = new Float32Array(nS), order = Array.from({ length: nS }, (_, i) => i);
    let lastSort = -1e9;
    const resort = (camLocal) => {
      const ft = this.uni.uFlowT.value, cc = meta.cent, om = meta.omega, kd = meta.kinds, tl = ft / 4;
      for (let i = 0; i < nS; i++) { const r = cr[i]; let a = 0; if (kd[i] === 3) a = (44 / 32) / r * (((tl + om[i]) % 1 + 1) % 1); else if (kd[i] === 7 || kd[i] === 13) a = kep(r) * ft;
        else if (kd[i] === 6) { const ag = ft / 6 + h11(meta.seeds[i] * 0.173), cyc = Math.floor(ag); a = kep(r) * (ag - cyc) * 6 + h11(meta.seeds[i] + cyc * 7.31) * 2 * Math.PI; } else a = (7 / 32) / r * Math.sin(2 * Math.PI * tl - 1.05 * r);
        const ca = Math.cos(a), sa = Math.sin(a), x = cc[3 * i] * ca + cc[3 * i + 2] * sa, z = -cc[3 * i] * sa + cc[3 * i + 2] * ca, y = cc[3 * i + 1]; const dx = x - camLocal.x, dy = y - camLocal.y, dz = z - camLocal.z; keys[i] = dx * dx + dy * dy + dz * dz; }
      order.sort((a, b) => keys[b] - keys[a]); for (let k = 0; k < nS; k++) { const s = order[k]; idxArr.set(baseIdx.subarray(s * per, s * per + per), k * per); } idxAttr.needsUpdate = true;
    };
    const sc = { root: g, kind: "disk", centered: false, kmPerUnit: () => KM.AU, camDist: 36, radius: 19, fit: () => ({ r: 16, up: 9, down: 9, frac: 16 * 32 / 1080, pfrac: 16 * 32 * 390 / 800 / 844, wide: true, cover: true, ar: 0.5 }), barMax: 6, barAt: [4, -13], strokes: D.disk.n + D.add.n + (massive ? D.wrap.n : 0), meshes: 4 + (sp ? 1 : 0) + (mw ? 1 : 0), bodies: D.bodies,
      chips: planets ? ["Planets drawn far larger than real"] : [],
      update: (c) => {
        const id = c.v.stage ? c.v.stage.id : ""; const t = c.v.t; const row = c.v.row; const Teff = row ? Math.pow(10, row.logT) : 4410;
        core.material.uniforms.uTeff.value = Teff; core.material.uniforms.uAlpha.value = 1;
        let diskA = 1, jetA = 1, wrapA = 1, coreExp = 1;
        if (id === "F3") { diskA = smooth(0, 0.25, t) * 0.8 + 0.2; jetA = smooth(0.05, 0.3, t); }
        if (id === "F4") { diskA = massive ? 1 - 0.85 * smooth(0, 0.6, t) : 1 - 0.45 * smooth(0.2, 1, t); jetA = massive ? 1 - smooth(0.2, 0.8, t) : 1 - 0.6 * smooth(0.3, 1, t); }
        if (id === "F5") { diskA = massive ? 0.15 * (1 - t) : 0.55 - 0.25 * t; jetA = massive ? 0 : 0.4 * (1 - t); wrapA = 1 - smooth(0.2, 0.9, t); coreExp = 1 + 0.5 * smooth(0.1, 1, t); }
        md.material.uniforms.uAlpha.value = diskA; ma.material.uniforms.uAlpha.value = jetA; if (sp) sp.material.uniforms.uAlpha.value = Math.min(1, diskA + 0.3);
        if (mw) mw.material.uniforms.uAlpha.value = id === "F3" ? 0.6 : wrapA;
        core.material.uniforms.uAlpha.value = coreExp > 1 ? 1 : 1;
        coreHot.visible = id === "F5"; if (coreHot.visible) { coreHot.material.uniforms.uAlpha.value = smooth(0.05, 0.9, t); }
        if (frost) frost.visible = id === "F3" || id === "F4";
        coT.set(id === "F3" ? "Protostar" : id === "F4" ? (mass === "1" ? "Young star (T Tauri)" : "Young star") : "Fusion starts in the core", id === "F3" ? "glows from squeezing, not fusion" : id === "F5" ? "about 10 million K" : "");
        const q = c.camQuatLocal, dotR = 0.14, tw = id !== "F5";
        cset.begin(); coT.place(vA.set(0, 0.25, 0), 3.5, 10.5, q, dotR);
        coJ.lab.visible = !c.phone && jetA > 0.25 && (id === "F3" || id === "F4"); coJ.place(vA.set(0.1, 5.5, 0), -4, 3.5, q, dotR);
        const orb = (b) => { const a = kep(b.r) * (c.flowT || 0), ca = Math.cos(a), sa = Math.sin(a); return vA.set(ca * b.px + sa * b.pz, 0, -sa * b.px + ca * b.pz); };   /* the callouts follow the orbiting planets */
        if (coR) { coR.lab.visible = tw; coR.place(orb(bR), -9, 1.5, q, dotR); }
        if (coG) { coG.lab.visible = tw && !c.phone; coG.place(orb(bG), 7, 3.2, q, dotR); }
        if (coF) { coF.lab.visible = !!frost && frost.visible; coF.place(vA.copy(frostA), 7, -6, q, dotR); }
        cset.flush();
        if (c.now - lastSort > 120) { resort(c.camLocal); lastSort = c.now; }
      } };
    this.cache[key] = sc; return sc;
  }

  // ---------------- stars: main sequence, giants and supergiants (units: zoomed, s Suns of radius per unit) ----------------
  star() {
    if (this.cache.star) return this.cache.star; const T = this.T; const g = new T.Group(); const body = new T.Group(); g.add(body);
    const sb = buildStar(21); const wb = buildShells(31, 260);
    const halo = this.glow([[2.4, 0.07], [1.6, 0.16], [1.22, 0.26], [1.04, 0.22], [0.5, 0.0]], { disc: 1.0, useTeff: true, order: 1 });
    // style B: compact stars get a tight glow and a crisp limb; giants a strong equal-bleed glow (LOOK-SPEC v2.3)
    const tight = this.glow([[1.45, 0.10], [1.14, 0.22], [1.03, 0.24]], { disc: 1.0, useTeff: true, order: 1 });
    const giantGlow = this.glow([[1.9, 0.12], [1.42, 0.26], [1.16, 0.34], [1.04, 0.3]], { useTeff: true, order: 4 });
    const ms = this.mesh(sb, { star: true }, 2); const mw = this.mesh(wb, { star: true, additive: true }, 3);
    // round 7: our own painted red supergiant (frame 3a): live-dealt strokes over a dark disc, crisp limb, thin ring and an equal-bleed halo
    const rb = buildRSG(15); const rsg = new T.Mesh(rb.geometry(T), new T.ShaderMaterial({ vertexShader: rsgVert, fragmentShader: strokeFrag, defines: { STAR: 1, CLIPR: 1 },
      uniforms: { ...this.uni, uAlpha: { value: 0 }, uTeff: { value: 3400 }, uExposure: { value: 1 }, uLut: { value: this.lut }, uCamO: { value: new T.Vector3(0, 0, 1) },
        uCell: { value: Array.from({ length: 12 }, () => new T.Vector4(0, 1, 0, 0.4)) }, uCellH: { value: Array.from({ length: 12 }, () => new T.Vector2(0, 1)) }, uRedeal: { value: 0 } },
      transparent: true, depthTest: false, depthWrite: false, side: T.DoubleSide, blending: T.NormalBlending, premultipliedAlpha: true }));
    rsg.frustumCulled = false; rsg.renderOrder = 2; rsg.visible = false;
    const rsgHalo = this.glow([[2.35, 0.24, [255, 176, 140]], [1.85, 0.30, [255, 180, 148]], [1.45, 0.22, [255, 186, 152]], [1.08, 0.32, [220, 150, 110]]], { disc: 1.0, useTeff: false, order: 1 });   /* extended warm-pink falloff like 3a, a dimmer disc so the lanes read */
    const rsgRing = this.glow([[1.08, 0]], { useTeff: false, order: 7 }); rsgRing.material.uniforms.uRing.value.set(1.0, 0.74, 0.58, 0.22);   /* gold-pink, lower peak, ragged in the shader */
    Object.assign(rsgRing.material, { blending: T.CustomBlending, blendEquation: T.AddEquation, blendSrc: T.OneFactor, blendDst: T.OneFactor, blendSrcAlpha: T.OneFactor, blendDstAlpha: T.OneFactor });   /* the ring adds light */
    for (const m of [rsgHalo, rsgRing]) m.material.uniforms.uBreath = { value: 0 };   /* no breathing scale: the disc edge stays on the painted limb */
    body.add(halo, tight, ms, mw, giantGlow, rsgHalo, rsg, rsgRing);
    const ref = this.dashedRing(1, { color: 0xFFF1EA, opacity: 0.85 }); ref.rotation.x = Math.PI / 2; g.add(ref);   // billboarded below
    const coRef = this.callout("The Sun's size", { size: 1.3, color: "#FFF1EA", side: 1 }); g.add(coRef.grp);
    const coT = this.callout("", { size: 1.8, side: -1 }); g.add(coT.grp);
    const ORB = { Mercury: [0.387, 200], Venus: [0.723, -25], Earth: [1.0, 155], Jupiter: [5.2, -35] };
    const orbits = {}; for (const [n, [a, ph]] of Object.entries(ORB)) { const o = this.dashedRing(1, { color: 0xC3C9E6, opacity: 0.75 }); const co = this.callout(n, { size: 1.3, side: Math.cos(ph * Math.PI / 180) >= 0 ? 1 : -1 }); g.add(o, co.grp); orbits[n] = { o, co, a, ph }; }
    // Sun activity on S1, placed to match Angelo's v5 layouts (glow strokes additive; the arcade grows by birth order)
    const prom = buildProminence(101, 2.6), fl = buildFlare(111);
    const promG = new T.Group(); const promM = [this.mesh(prom.glow, { additive: true }, 5), this.mesh(prom.core, {}, 6)]; promG.add(...promM, this.sprites(prom.feet, 5)); g.add(promG);
    const flG = new T.Group(); const flCore = this.mesh(fl.core, { grow: true }, 6), flGlow = this.mesh(fl.glow, { additive: true, grow: true }, 5); flG.add(flGlow, flCore); g.add(flG);
    const coP = this.callout("Prominence", { sub: "gas held up by magnetic fields", size: 1.3, side: -1 }), coL = this.callout("Limb darkening", { sub: "cooler, dimmer edge", size: 1.3, side: 1 }); g.add(coP.grp, coL.grp);
    // Leo frame 2: a granulation close-up, 50 times closer than the Sun's disc, on the main-sequence stage of the 1 Sun path (not on phone)
    const lg = this.loupe({ title: "Close-up, 50 times closer", note: "Granulation", noteSub: "hot gas rising in cells", note2: "contrast boosted, sped up for viewing", aspect: 1, paint: (cv) => paintGranulation(cv), live: true, barLabel: "5,000 km", barFrac: 5000 / GRAN_KM, side: 1 }); g.add(lg.grp); lg.grp.visible = false;
    const levels = [0.001, 0.01, 0.1, 1, 10, 100, 1000];
    const HERO = { ms: [321 / 1080, 321 * 390 / 760 / 844], giant: [328 / 1080, 328 * 390 / 920 / 844], super: [417 / 1080, 417 * 390 / 900 / 844] };
    const heroClass = (id) => (/^(S2|S4|S5|T2|T4|T5)$/.test(id) ? "giant" : /^(H2|V2)$/.test(id) ? "super" : "ms");
    const basis = (q, dirCam, zCam) => { const Y = dirCam.clone().applyQuaternion(q).normalize(), Z = zCam.clone().applyQuaternion(q).normalize(); const X = new T.Vector3().crossVectors(Y, Z).normalize(); Z.crossVectors(X, Y); return new T.Quaternion().setFromRotationMatrix(new T.Matrix4().makeBasis(X, Y, Z)); };
    const sc = { root: g, kind: "star", s: 1, camDist: 44, radius: 10, strokes: sb.n + wb.n + rb.n + prom.core.n + prom.glow.n + fl.core.n + fl.glow.n, meshes: 12, body, ms, halo, rsg, rsgHalo, rsgOn: 0,
      kmPerUnit: () => sc.s * KM.RSUN, fitF: null, fit: () => sc.fitF, lamRef: true,
      zoomFor(R, hi = 24) { const lo = hi / 10; let s = sc.s; if (R / s > hi || R / s < lo) { s = levels.find((L) => R / L <= hi && R / L >= lo) || levels.reduce((a, b) => (Math.abs(Math.log10(R / b / 8)) < Math.abs(Math.log10(R / a / 8)) ? b : a)); } return s; },
      reset(R) { sc.s = levels.find((L) => R / L <= 16 && R / L >= 1.6) || 1; },
      update: (c) => {
        const L = c.lam || 1;   /* label offsets and dots keep their screen size when the framing moves the camera in */
        const row = c.v.row; if (!row) return; const R = Math.pow(10, row.logR), Teff = Math.pow(10, row.logT);
        const lock = c.v.stage && c.v.stage.zoomLock && c.v.refR;   // R2: hold the zoom of its main-sequence size, so it visibly shrinks
        const cls = heroClass(c.v.stage ? c.v.stage.id : ""), Rmax = c.v.maxR || R, wide = cls === "super" && !lock;   /* H2/V2: one zoom for the stage's largest radius, so the star swells in a steady frame */
        sc.s = lock ? (levels.find((L) => c.v.refR / L <= 24 && c.v.refR / L >= 2.4) || sc.s) : sc.zoomFor(wide ? Rmax : R, c.fitMax || 16);
        let Rshow = R; const sw = c.v.swell, tt = c.v.t, lR0 = Math.log10(Math.max(Rmax, 2)) - 1.6, lR1 = Math.log10(Math.max(Rmax, 2)) - 0.15;
        if (wide && sw && tt > sw.a && tt < sw.b) { const u = (tt - sw.a) / (sw.b - sw.a), e = u * u * (3 - 2 * u); Rshow = Math.pow(10, sw.la + (sw.lb - sw.la) * e); }   /* round 9: the swell is about 3 s and eases in and out (smoothstep on log radius), then rejoins the track exactly */
        const r = Rshow / sc.s; body.scale.setScalar(r); sc.radius = wide ? Rmax / sc.s : r; sc.barMax = wide ? (Rmax / sc.s) * 0.8 : undefined;
        { const hc = HERO[cls]; const Rref = lock ? Math.max(c.v.refR, R) : cls === "ms" ? R : wide ? Rmax : Math.pow(Math.max(Rmax, R), 0.6) * Math.pow(R, 0.4);
          sc.fitF = c.fitMax ? null : { r: Rref / sc.s, frac: hc[0], pfrac: hc[1], cover: true, up: Rref / sc.s * 1.15, pover: cls === "super" ? 1.25 : 1.12 }; }
        for (const m of [ms, mw]) { m.material.uniforms.uTeff.value = Teff; m.material.uniforms.uExposure.value = 1.0; }
        const giant = clamp((row.logR - 0.9) / 1.0, 0, 1); const crisp = 1 - smooth(0.0, 0.5, giant);
        ms.material.uniforms.uCrisp.value = crisp; ms.material.uniforms.uMixG.value = giant; ms.scale.setScalar(1 - 0.045 * crisp);   // compact stars: strokes sit inside the crisp disc   // giant-cell look switches in smoothly as the star swells
        for (const h of [halo, tight, giantGlow]) { h.material.uniforms.uTeff.value = Teff; }
        { const chroma = crisp * smooth(7600, 6600, Teff) * smooth(4000, 4900, Teff);   /* the Sun-like main sequence: warm limb, granulation, warm glow */
          ms.material.uniforms.uChroma.value = chroma; halo.material.uniforms.uChroma.value = chroma; }
        halo.material.uniforms.uExposure.value = 1.08; tight.material.uniforms.uExposure.value = 1.08;
        halo.visible = true; tight.visible = false;   // stars keep the equal-bleed glow; only the remnants get tight glows
        giantGlow.visible = giant > 0.05; giantGlow.material.uniforms.uAlpha.value = 0.9 * smooth(0.2, 1, giant);
        { /* cool giants switch to the live painted supergiant (frame 3a). On a super stage the mix eases out over the swell (2 to 3 s), with a blue-white, yellow, orange-red colour path, not a pop. */
          const on = wide ? (() => { return smooth(lR0, lR1, Math.log10(Math.max(Rshow, 1.01))); })() : smooth(0.45, 0.75, giant) * smooth(4700, 4200, Teff);
          sc.rsgOn = on; const TeffShow = wide ? (on < 0.35 ? Math.pow(10, Math.log10(22000) * (1 - on / 0.35) + Math.log10(8500) * (on / 0.35))
            : on < 0.7 ? Math.pow(10, Math.log10(8500) * (1 - (on - 0.35) / 0.35) + Math.log10(4800) * ((on - 0.35) / 0.35))
            : Math.pow(10, Math.log10(4800) * (1 - (on - 0.7) / 0.3) + Math.log10(Math.max(Teff, 3300)) * ((on - 0.7) / 0.3))) : Teff;
          rsg.visible = rsgHalo.visible = rsgRing.visible = on > 0.001; ms.visible = on < 0.999;
          ms.material.uniforms.uAlpha.value = 1 - on; halo.material.uniforms.uAlpha.value = 1 - on; giantGlow.material.uniforms.uAlpha.value *= 1 - on;
          mw.material.uniforms.uAlpha.value = 1 - 0.7 * on;
          for (const m of [ms, mw, halo, tight, giantGlow]) m.material.uniforms.uTeff.value = TeffShow;
          if (rsg.visible) { const u = rsg.material.uniforms; u.uAlpha.value = on; u.uTeff.value = TeffShow; u.uRedeal.value = (wide && on > 0.05 && on < 0.98) ? 1 : 0; rsgHalo.material.uniforms.uTeff.value = TeffShow; rsgHalo.material.uniforms.uExposure.value = 0.7; u.uExposure.value = 1.32;
            rsgHalo.material.uniforms.uAlpha.value = on; rsgRing.material.uniforms.uAlpha.value = on;
            const cells = rsgCells(c.flowT || 0); cells.forEach((ce, i) => { u.uCell.value[i].set(ce.d[0], ce.d[1], ce.d[2], ce.rad); u.uCellH.value[i].set(ce.h, ce.sgn); });
            g.updateMatrix(); body.updateMatrix(); const m = new T.Matrix4().multiplyMatrices(g.matrix, body.matrix).invert(); u.uCamO.value.copy(c.camLocal).applyMatrix4(m).normalize(); } }
        const peek = c.st.peek && c.st.answers["S1:0"]; const pk = peek ? tRGB255Peek(c.st.answers["S1:0"]) : null;
        for (const m of [ms, halo, tight]) { m.material.uniforms.uPeekOn.value = pk ? 1 : 0; if (pk) m.material.uniforms.uPeek.value.set(pk[0] / 255, pk[1] / 255, pk[2] / 255); }
        const winds = !!(c.v.stage && c.v.stage.winds); mw.visible = winds; mw.material.uniforms.uWind.value = winds ? 1 : 0; mw.material.uniforms.uWindLen.value = 0.55;
        if (!c.calm) body.rotation.y += c.dt * 0.02;
        const q = c.camQuatLocal; const rt = new T.Vector3(1, 0, 0).applyQuaternion(q), up = new T.Vector3(0, 1, 0).applyQuaternion(q);
        const halfH = c.halfH || 20; const capUp = (y, h) => Math.min(h, halfH * 0.86 - y);
        // the Sun-size reference ring (R1) and the main-sequence ring (R2), at the same scale as the star
        const st = c.v.stage || {}; ref.visible = coRef.grp.visible = st.ref === "sunRing" || (st.ref === "msRing" && !!c.v.refR);
        if (ref.visible) { const rr = (st.ref === "msRing" ? c.v.refR : 1) / sc.s; coRef.set(st.ref === "msRing" ? "Its size at the end of its main sequence" : "The Sun's size"); ref.scale.setScalar(rr); ref.quaternion.copy(q); ref.rotateX(Math.PI / 2);
          coRef.place(new T.Vector3().addScaledVector(rt, rr * 0.707).addScaledVector(up, -rr * 0.707), Math.max(2 * L, rr * 0.3), -Math.max(1.5 * L, rr * 0.25), q, 0.18 * L); }
        const names = st.orbits || [];
        for (const [n, ob] of Object.entries(orbits)) {
          const on = names.includes(n); ob.o.visible = ob.co.grp.visible = on; if (!on) continue;
          const rr = ob.a * 215.032 / sc.s; ob.o.scale.setScalar(rr); ob.o.rotation.set(0.22, 0, 0); ob.o.material.opacity = rr < r ? 0.45 : 0.8;
          const tx = orbitText(st.id, n); ob.co.set(tx[0], tx[1]);
          const ph = ob.ph * Math.PI / 180; const p = new T.Vector3(Math.cos(ph) * rr, 0, -Math.sin(ph) * rr).applyAxisAngle(new T.Vector3(1, 0, 0), 0.22);
          const sd = ob.co.side; ob.co.place(p, sd * Math.max(2.5 * L, r * 0.25), capUp(p.y, Math.max(2 * L, r * 0.3)), q, 0.18 * L);
        }
        // the star's own label hangs off its upper-left limb, kept inside the view (never clipped at the top)
        coT.set(c.v.type, c.help >= 1 && !c.v.hideTeff ? `${Math.round(Teff).toLocaleString("en-US")} K` : "");
        const aT = new T.Vector3().addScaledVector(rt, -r * 0.64).addScaledVector(up, r * 0.77); coT.grp.visible = !!c.v.type && !names.length && st.id !== "S1";
        coT.place(aT, -Math.max(2 * L, r * 0.22), capUp(aT.dot(up), Math.max(1.6 * L, r * 0.2)), q, 0.16 * L);
        // S1: prominence on the upper-right limb, a flare arcade on the disc toward the lower right, limb darkening note
        const s1 = st.id === "S1"; promG.visible = flG.visible = coP.grp.visible = coL.grp.visible = s1;
        { const on = s1 && c.st.mass === "1" && !c.phone; const kpu = sc.s * KM.RSUN, MAG = 50, W = GRAN_KM * MAG / kpu;
          lg.update(q, new T.Vector3().addScaledVector(rt, -r * 1.58).addScaledVector(up, r * 0.34), W, new T.Vector3().addScaledVector(rt, -r * 0.62).addScaledVector(up, r * 0.62), on); }
        if (s1) { promG.quaternion.copy(basis(q, new T.Vector3(0.42, 0.91, 0), new T.Vector3(0, 0, 1))); promG.position.copy(new T.Vector3(0.42, 0.91, 0).applyQuaternion(q).multiplyScalar(r * 0.99)); promG.scale.setScalar(r * 1.5);
          { const PERIOD = 10; const ph = ((c.flowT || 0) / PERIOD + 0.4) % 1; const rise = 0.5 - 0.5 * Math.cos(2 * Math.PI * ph);   /* ping-pong lift: smooth cosine, no snap back; starts high so the stills show the loop */
            for (const m of promM) m.material.uniforms.uRise.value = 0.22 + 0.50 * rise; }   /* cap the peak so the arc stays in frame */
          const fd = new T.Vector3(0.52, -0.42, 0.74).normalize(); flG.quaternion.copy(basis(q, fd, new T.Vector3(0, 0, 1))); flG.position.copy(fd.clone().applyQuaternion(q).multiplyScalar(r)); flG.scale.setScalar(r);
          const gr = smooth(0.05, 0.9, c.v.t); flCore.material.uniforms.uGrow.value = gr; flGlow.material.uniforms.uGrow.value = gr;
          const ap = new T.Vector3(0.42, 0.91, 0).applyQuaternion(q).multiplyScalar(r * 1.2); coP.place(ap, -Math.max(2 * L, r * 0.45), capUp(ap.dot(up), Math.max(1.2 * L, r * 0.1)), q, 0.15 * L);
          const al = new T.Vector3().addScaledVector(rt, r * 0.83).addScaledVector(up, -r * 0.56); coL.place(al, r * 0.04, -Math.max(1.5 * L, r * 0.36), q, 0.15 * L); }
      } };
    ms.material.uniforms.uMixG = { value: 0 };
    ms.material.vertexShader = ms.material.vertexShader.replace("uniform float uTeff;", "uniform float uTeff; uniform float uMixG;").replace("lin * aColor.r * ld", "lin * mix(aColor.r, aColor.b, uMixG) * ld").replace("tlin(uTeff + aColor.g * 1000.0 - 500.0)", "tlin(uTeff + (aColor.g * 1000.0 - 500.0) * uMixG)");
    this.cache.star = sc; return sc;
  }

  // ---------------- core cutaways: helium flash, quiet ignition, onion shells, core collapse ----------------
  cutaway() {
    if (this.cache.cut) return this.cache.cut; const T = this.T; const st = this.star(); const g = new T.Group();
    const { b } = buildOnion(41); const on = this.mesh(b, {}, 8); const face = new T.Group(); face.add(on); g.add(face);
    const flash = this.glow([[0.5, 1.0, [255, 255, 255]], [0.25, 1.0, [255, 255, 255]]], { useTeff: false, order: 9 }); face.add(flash);
    const lab = this.label("Core, enlarged (not to scale)", { size: 1.4 }); g.add(lab);
    const key = this.label("Colors are a key to the fuels, not real colors", { size: 1.0, color: "#C3C9E6", plate: false }); g.add(key);
    const layLabs = ONION.map(([n]) => { const l = this.label(n, { size: 0.9, color: "#FFFFFF", plate: false }); l.userData.minPx = 10; face.add(l); return l; });
    const sc = { root: g, kind: "cutaway", camDist: 46, radius: 10, strokes: b.n + st.strokes, meshes: 2 + st.meshes, star: st,
      kmPerUnit: () => st.kmPerUnit(),
      update: (c) => {
        st.update(c); { const k = st.rsgOn; st.ms.material.uniforms.uAlpha.value = 0.32 * (1 - k); st.halo.material.uniforms.uAlpha.value = 0.55 * (1 - k); st.rsg.material.uniforms.uAlpha.value = 0.32 * k; st.rsgHalo.material.uniforms.uAlpha.value = 0.55 * k; }
        const r = st.radius; const R0 = Math.min(r * 0.78, 9); face.scale.setScalar(R0); face.quaternion.copy(c.camQuatLocal);
        face.position.copy(new T.Vector3(0, 0, r * 0.2).applyQuaternion(c.camQuatLocal));
        const cut = c.v.stage.cut; const t = c.v.t; const A = [0.55, 0, 0, 0, 0, 0, 0]; let fl = 0; let fscale = 1;
        const showCut = c.st.toggles.cut || cut !== "flash";
        if (cut === "flash") { A[1] = 1; fl = (Math.sin(c.now * 0.025) * 0.5 + 0.5) * smooth(0.15, 0.3, t) * (1 - smooth(0.75, 0.95, t)); }
        if (cut === "quiet") { A[1] = 1; fl = 0.35 * smooth(0.1, 0.9, t); }
        if (cut === "onion" || cut === "onionBars") { const p = c.v.onion != null ? c.v.onion : 0; for (let i = 1; i <= 5; i++) A[i] = 0.25 + 0.75 * smooth((i - 1) / 5, (i - 0.6) / 5, p); A[6] = 0.3 + 0.7 * smooth(0.85, 1, p); }
        if (cut === "collapse") { for (let i = 1; i <= 6; i++) A[i] = 0.9; fscale = 1 - 0.85 * smooth(0.2, 0.55, t); A[6] = 1; fl = smooth(0.5, 0.6, t) * (1 - smooth(0.6, 1, t)); }
        on.material.uniforms.uLayerA.value = A; on.visible = showCut; key.visible = lab.visible = showCut;
        if (cut === "collapse") { on.material.uniforms.uLayerA.value = A.map((a, i) => (i === 6 ? a : a * (1 - 0.6 * smooth(0.3, 0.6, t)))); }
        face.children[0].scale.setScalar(1); flash.scale.setScalar(cut === "collapse" ? 0.25 * fscale + 0.05 : 0.6);
        flash.visible = fl > 0.01 && showCut; flash.material.uniforms.uAlpha.value = fl;
        const radii = [1.0, 0.72, 0.52, 0.38, 0.28, 0.19, 0.11];
        layLabs.forEach((l, i) => { l.visible = showCut && A[i] > 0.4 && (cut === "onion" || cut === "onionBars" || i <= 1 || (cut === "collapse" && i === 6)); l.position.set(0, (radii[i] + (radii[i + 1] || 0)) / 2, 0.02); l.userData.base = [0.9 * 4 / R0 * 1.2, 0.9 / R0 * 1.2]; });
        lab.position.copy(new T.Vector3(0, -R0 - 1.8, 0).applyQuaternion(c.camQuatLocal)); const gap = lab.scale.y * 0.2 + key.scale.y * 0.2; key.position.copy(new T.Vector3(0, -R0 - 1.8 - gap, 0).applyQuaternion(c.camQuatLocal));   /* the key sits under the title at any label size */
      } };
    this.cache.cut = sc; return sc;
  }

  // ---------------- planetary nebula (units: 0.01 light-year) ----------------
  nebula() {
    if (this.cache.neb) return this.cache.neb; const T = this.T; const g = new T.Group();
    const nb = buildNebula(51); const mn = this.mesh(nb, { additive: true }, 2); const shell = new T.Group(); shell.add(mn); g.add(shell);
    const core = this.glow([[2.2, 0.25], [0.9, 0.6], [0.35, 1.0]], { useTeff: true, order: 3 }); g.add(core);
    const scope = this.glow([[22, 0.35, [79, 216, 192]], [14, 0.4, [120, 230, 210]], [6, 0.3, [190, 240, 230]]], { useTeff: false, order: 4 }); g.add(scope);
    const lab = this.label("Hot core", { size: 1.6 }); g.add(lab);
    const sc = { root: g, kind: "nebula", camDist: 75, radius: 20, strokes: nb.n, meshes: 3, kmPerUnit: () => 0.01 * KM.LY,
      update: (c) => {
        const t = c.v.stage && c.v.stage.then === "wd" ? Math.min(1, c.v.t / 0.5) : c.v.t; const row = c.v.row;
        const s = 7 + 13 * t; shell.scale.setScalar(s); mn.material.uniforms.uAlpha.value = 0.55 + 0.45 * smooth(0, 0.3, t);
        core.material.uniforms.uTeff.value = row ? Math.pow(10, row.logT) : 50000;
        const tel = !!c.st.toggles.scope; mn.visible = !tel; scope.visible = tel; scope.scale.setScalar(s / 20);
        this.setLabel(lab, tel ? "Small telescope view" : "Hot core", tel ? "a round, fuzzy disk, like a planet" : "far too small to see at this scale"); lab.position.set(0, tel ? -s - 3 : -3.5, 0);
      } };
    this.cache.neb = sc; return sc;
  }

  // ---------------- white dwarf beside Earth, same scale (units: 1,000 km). Style B v2.3: crisp sphere, tight glow, painted Earth ----------------
  wd() {
    if (this.cache.wd) return this.cache.wd; const T = this.T; const g = new T.Group(); const body = new T.Group(); g.add(body);
    const sb = buildStar(23, { broad: 200, medium: 640, hi: 280 }); const ms = this.mesh(sb, { star: true, crisp: 1 }, 2);
    ms.material.uniforms.uMixG = { value: 0 }; ms.material.vertexShader = ms.material.vertexShader.replace("uniform float uTeff;", "uniform float uTeff; uniform float uMixG;").replace("lin * aColor.r * ld", "lin * mix(aColor.r, aColor.b, uMixG) * ld").replace("tlin(uTeff + aColor.g * 1000.0 - 500.0)", "tlin(uTeff + aColor.g * 320.0 - 160.0)");   /* a touch of painted surface variation (optional item 5) */
    const halo = this.glow([[1.55, 0.10], [1.18, 0.20], [1.04, 0.22]], { disc: 1.0, useTeff: true, order: 1 }); ms.scale.setScalar(0.955); body.add(halo, ms);
    const earth = new T.Group(); const eb = buildEarth2(71); const em = this.mesh(eb, {}, 3); em.scale.setScalar(0.95);
    const ocean = new T.Mesh(new T.CircleGeometry(0.996, 64), new T.MeshBasicMaterial({ color: 0x123F78, depthTest: false, depthWrite: false })); ocean.renderOrder = 2;
    const atmo = this.glow([[1.09, 0.30, [120, 170, 255]], [1.035, 0.45, [160, 196, 255]]], { useTeff: false, order: 1 });
    earth.add(atmo, ocean, em); g.add(earth);
    const coW = this.callout("White dwarf", { side: 1 }), coE = this.callout("Earth, 6,371 km radius", { sub: "same scale", side: 1 }); g.add(coW.grp, coE.grp);
    const RW0 = 9.18, RE = 6.371, D = 2.77 * RW0;   // Leo's wd params: 166 px and 115.2 px radii, centres 460 px apart
    const xw = (RW0 - RE - D) / 2, xe = xw + D; const half = (D + RW0 + RE) / 2;
    const sc = { root: g, kind: "wd", body, camDist: 70, radius: Math.max(RW0, RE) * 1.1, strokes: sb.n + eb.n, meshes: 5, chips: [], kmPerUnit: () => 1000,
      fit: () => ({ r: half, up: RW0 * 1.7, down: RE * 1.9, frac: 741 / 2 / 1080, pfrac: 741 / 2 * 390 / 900 / 844, ar: 0.5, cover: true }),
      update: (c) => {
        const row = c.v.cooling || c.v.row; if (!row) return; const Rsun = Math.pow(10, row.logR), Teff = Math.pow(10, row.logT); const Rkm = Rsun * KM.RSUN;
        const r = Rkm / 1000; body.scale.setScalar(r); earth.scale.setScalar(RE); body.position.set(xw, 0, 0); earth.position.set(xe, 0, 0); earth.quaternion.copy(c.camQuatLocal);
        ms.material.uniforms.uTeff.value = Teff; halo.material.uniforms.uTeff.value = Teff; halo.material.uniforms.uExposure.value = 1.1;
        const pred = c.st.mass === "0.2";
        coW.set(pred ? "Helium white dwarf (predicted)" : "White dwarf", `about ${about(Rkm, 2)} km radius` + (c.help >= 1 ? `, ${Math.round(Teff).toLocaleString("en-US")} K` : ""));
        const q = c.camQuatLocal; const rt = new T.Vector3(1, 0, 0).applyQuaternion(q), up = new T.Vector3(0, 1, 0).applyQuaternion(q);
        coW.place(body.position.clone().addScaledVector(rt, r * 0.17).addScaledVector(up, r * 0.985), -r * 0.12, r * 0.42, q, r * 0.025);
        coE.place(earth.position.clone().addScaledVector(rt, -RE * 0.34).addScaledVector(up, -RE * 0.94), -RE * 0.3, -RE * 0.75, q, RE * 0.035);
        sc.chips = [`Same scale: the white dwarf is about ${about(Rkm / KM.REARTH, 2)} Earths wide`];
      } };
    this.cache.wd = sc; return sc;
  }

  // ---------------- supernova to remnant (H5): debris at about 10,000 km/s from 1 day to about 250 years (example), honest zoom steps ----------------
  supernova() {
    if (this.cache.sn) return this.cache.sn; const T = this.T; const g = new T.Group();
    const db = buildRemnant(63, 1550); const md = this.mesh(db, { additive: true }, 2); const bloom = this.sprites(db.glow, 3); const shell = new T.Group(); shell.add(md, bloom); g.add(shell);
    const flash = this.glow([[3.2, 0.25, [255, 250, 245]], [1.4, 0.55, [255, 250, 245]], [0.5, 1.0, [255, 255, 255]], [0.12, 1.0, [255, 255, 255]]], { useTeff: false, order: 5 }); g.add(flash);
    const prog = this.glow([[1.2, 0.5], [0.45, 1.0]], { useTeff: true, order: 3 }); prog.material.uniforms.uTeff.value = 3300; g.add(prog);
    const coS = this.callout("Debris shell", { side: -1 }), coN = this.callout("A neutron star hides at the center", { sub: "too small to see at this scale", side: -1 }); g.add(coS.grp, coN.grp);
    const V = 10000, YR = 3.15576e7, Y0 = 1 / 365.25, Y1 = 250, S_END = 17;   // shell at Y1 drawn at S_END units (Leo: R0 290 px)
    const kEnd = 0.5 * KM.LY; /* half a light-year per unit at the end: the shell then spans about 17 units */ const levels = [0, 1, 2, 3, 4, 5, 6].map((k) => kEnd / Math.pow(10, k));
    const sc = { root: g, kind: "supernova", camDist: 75, radius: 18, strokes: db.n, meshes: 4, k: levels[6], kmPerUnit: () => sc.k,
      fit: () => ({ r: S_END, frac: 290 / 1080, pfrac: 290 * 390 / 760 / 844, cover: true, pover: 1.25 }),
      update: (c) => {
        const t = c.v.t; const yrs = Math.pow(10, Math.log10(Y0) + (Math.log10(Y1) - Math.log10(Y0)) * t); const rkm = V * YR * yrs;
        /* round 7: once the stage ends the debris keeps coasting: strands drift out at their own speeds in strokeVert (about 2.3% in the
           first 12 s, easing off), the frame and the 250-year scale stay put, so the label anchor never moves */
        sc.hold = t >= 0.999 ? (sc.hold || 0) + (c.dt || 0) : 0; const ex = 0.06 * (1 - Math.exp(-sc.hold / 25));
        md.material.uniforms.uExp.value = ex; bloom.scale.setScalar(1 + ex * 1.0);
        sc.k = levels.slice().reverse().find((L) => rkm / L <= S_END * 1.05) || levels[0]; const S = rkm / sc.k; shell.scale.setScalar(S); sc.radius = Math.max(S, 3); shell.quaternion.copy(c.camQuatLocal);
        const early = 1 - smooth(0.05, 0.35, t);
        const peak = this.reduced ? 0.6 * smooth(0, 0.08, t) * early : smooth(0, 0.02, t) * (0.15 + 0.85 * early);
        flash.material.uniforms.uAlpha.value = peak; flash.scale.setScalar(S_END * 0.35 * (0.6 + 0.4 * early)); prog.visible = t < 0.01;
        md.material.uniforms.uAlpha.value = smooth(0.0, 0.06, t) * (0.55 + 0.45 * smooth(0.3, 0.9, t)); bloom.material.uniforms.uAlpha.value = md.material.uniforms.uAlpha.value;
        c.extra.snYears = yrs;
        const days = yrs * 365.25; const age = yrs < 1 ? `${about(days, 2)} days old` : `about ${about(yrs, 2)} years old`;
        coS.set("Debris shell", age + (yrs >= 1 ? " (example)" : ""));
        const q = c.camQuatLocal; const rt = new T.Vector3(1, 0, 0).applyQuaternion(q), up = new T.Vector3(0, 1, 0).applyQuaternion(q);
        const hh = c.halfH || 20; coS.place(new T.Vector3().addScaledVector(rt, -S * 0.7).addScaledVector(up, S * 0.45), -Math.max(S * 0.45, hh * 0.3), Math.max(S * 0.2, hh * 0.15), q, S * 0.012);
        coN.grp.visible = t > 0.35; coN.place(new T.Vector3(), -Math.max(S * 1.05, hh * 0.6), -Math.max(S * 0.28, hh * 0.15), q, S * 0.012);
        if (c.phone) { coS.place(new T.Vector3().addScaledVector(rt, -S * 0.6).addScaledVector(up, S * 0.55), -S * 0.1, Math.max(S * 0.5, hh * 0.3), q, S * 0.012); coN.place(new T.Vector3(), -S * 0.1, -Math.max(S * 1.15, hh * 0.45), q, S * 0.012); }
      } };
    this.cache.sn = sc; return sc;
  }

  // ---------------- neutron star over a city, same scale (units: km). Leo ns params: r 12 km = 72 px, 20 km city, ground 58 km below ----------------
  ns() {
    if (this.cache.ns) return this.cache.ns; const T = this.T; const g = new T.Group(); const body = new T.Group(); g.add(body);
    const sb = buildStar(25, { broad: 220, medium: 600, hi: 0 }); const ms = this.mesh(sb, { star: true, crisp: 1 }, 3);
    ms.material.vertexShader = ms.material.vertexShader.replace("tlin(uTeff + aColor.g * 1000.0 - 500.0)", "tlin(uTeff)");
    // LOOK-SPEC 3.4: surface 1,000,000 K (#95B1FF at the edge), white-hot core by the equal bleed, crisp edge, thin ring, tight glow
    const halo = this.glow([[2.1, 0.13], [1.4, 0.6], [1.03, 0.5]], { disc: 1.0, useTeff: true, order: 2 }); ms.scale.setScalar(0.955); body.add(halo, ms);
    // round 7: no surface spin (it aliased). Two faint hot spots at the magnetic poles sweep round every 4 s (the pulsar beam, tilted 35 deg
    // from the spin axis); a spot brightens when its pole points at us (a slight beamed pulse)
    const spots = [0, 1].map(() => { const s2 = this.glow([[0.42, 0.22], [0.2, 0.5], [0.09, 0.7]], { useTeff: true, order: 4 }); s2.material.uniforms.uTeff.value = 2e6; s2.material.uniforms.uExposure.value = 1.6; s2.material.uniforms.uBreath = { value: 0 };
      Object.assign(s2.material, { blending: T.CustomBlending, blendEquation: T.AddEquation, blendSrc: T.OneFactor, blendDst: T.OneFactor, blendSrcAlpha: T.OneFactor, blendDstAlpha: T.OneFactor }); body.add(s2); return s2; });   /* additive: a spot only adds light */
    // the ground is drawn in elevation (a camera-facing band whose top edge sits 58 km below the star), as in Leo's frame
    const GY = -58; const land = new T.Group(); g.add(land); const cb = buildCity(81, 0); const city = this.mesh(cb, {}, 5);
    const gq = new T.PlaneGeometry(4000, 2000); gq.translate(0, -1000, 0); const ground = new T.Mesh(gq, new T.MeshBasicMaterial({ color: 0x070B22, depthTest: false, depthWrite: false })); ground.renderOrder = 4;
    const hz = horizonGlow(T); hz.scale.set(55, 3.2, 1); hz.material.opacity = 0.55; hz.renderOrder = 5; land.add(ground, hz, city);
    const wisps = []; const Rw = rng(31); for (let i = 0; i < 26; i++) { const a = Rw() * Math.PI * 2, rr = 120 + Rw() * 170; wisps.push({ p: [-300 + Math.cos(a) * rr * 1.2, 20 + Math.sin(a) * rr * 0.8, -700], r: 70 + Rw() * 90, rgb: i % 3 ? [255, 90, 106] : [79, 216, 192], a: 0.04 + Rw() * 0.04, breath: 1 });   /* the far remnant's wisps breathe */ }
    const rem = this.sprites(wisps, 0); g.add(rem);
    const coN = this.callout("Neutron star", { sub: "about 12 km radius", side: 1 }), coC = this.callout("A city about 20 km wide", { sub: "at the same scale", side: -1 }), coR = this.callout("Supernova remnant", { sub: "far behind, not to scale", side: -1 });
    const coS = this.callout("Hot spots", { sub: "spin slowed way down;\na young one spins many times per second", side: 1 });   /* Tesla: the demo spin is slowed; a real young pulsar spins many times a second */
    g.add(coN.grp, coC.grp, coR.grp, coS.grp);
    // Leo frame 3b: the city 80 times closer (a 840 m wide skyline, 200 m bar), joined to the city on the horizon
    const lc = this.loupe({ title: "80 times closer", aspect: CITY_ASPECT, paint: (cv) => paintCity(cv), barLabel: "200 m", barFrac: 200 / CITY_M, side: -1 }); g.add(lc.grp);
    const sc = { root: g, kind: "ns", camDist: 62, radius: 14, barAt: [58, -67], reach: 98, strokes: sb.n + cb.n, meshes: 8, kmPerUnit: () => 1,
      fit: () => ({ r: 12, right: 98, down: 64, up: 20, pdown: 64, frac: 72 / 1080, pfrac: 72 * 390 / 860 / 844, ar: 1 }),
      update: (c) => {
        body.scale.setScalar(12); body.position.set(0, 0, 0);
        { const ph = 2 * Math.PI * (c.flowT || 0) / 4, tilt = 35 * Math.PI / 180; const view = c.camLocal.clone().normalize();
          spots.forEach((s2, k) => { const sg = k ? -1 : 1; const d = new T.Vector3(Math.sin(tilt) * Math.cos(ph), Math.cos(tilt), Math.sin(tilt) * Math.sin(ph)).multiplyScalar(sg);
            s2.position.copy(d.clone().multiplyScalar(0.97)); const f = d.dot(view); s2.material.uniforms.uAlpha.value = (0.25 + 0.35 * Math.pow(Math.max(f, 0), 6)) * smooth(0.0, 0.35, f);   /* beamed: brightest when the pole points at us */ }); }
        land.quaternion.copy(c.camQuatLocal); land.position.copy(new T.Vector3(0, GY, 0).applyQuaternion(c.camQuatLocal));
        ms.material.uniforms.uTeff.value = 1e6; ms.material.uniforms.uExposure.value = 2.2; ms.material.uniforms.uAlpha.value = 0.5; halo.material.uniforms.uTeff.value = 1e6; halo.material.uniforms.uExposure.value = 2.0;   /* low-contrast surface; the pulse is the beamed spot itself (no size change) */
        const q = c.camQuatLocal; const rt = new T.Vector3(1, 0, 0).applyQuaternion(q), up = new T.Vector3(0, 1, 0).applyQuaternion(q);
        coN.place(new T.Vector3().addScaledVector(rt, 12 * 0.7).addScaledVector(up, 12 * 0.7), 9, 7, q, 0.4);
        /* Tesla spin caption: desktop hangs left of the star (clear of the city loupe); phone hangs below-right (clear of the star and the city label) */
        if (c.phone) { coS.lab.center.set(coS.lab.userData.x0, 0.5); coS.place(new T.Vector3().addScaledVector(rt, 12 * 0.85).addScaledVector(up, -12 * 1.05), 14, -15, q, 0.4); }
        else { coS.lab.center.set(coS.lab.userData.x1, 0.5); coS.place(new T.Vector3().addScaledVector(rt, -12 * 0.75).addScaledVector(up, 12 * 0.65), -15, 8, q, 0.4); }
        coC.place(new T.Vector3().addScaledVector(up, GY + 0.3), -50, 9, q, 0.35);
        const ra = new T.Vector3(-300, 60, -700); coR.place(ra, -30, 40, q, 1.5);
        { const MAG = 80, W = CITY_M / 1000 * MAG;   /* 1 unit = 1 km */
          lc.update(q, new T.Vector3().addScaledVector(rt, 62).addScaledVector(up, -33), W, new T.Vector3().addScaledVector(up, GY + 0.3), !c.phone); }
      } };
    this.cache.ns = sc; return sc;
  }

  // ---------------- black hole, 10 Sun example (units: 2 km): horizon 30 km dashed inside a shadow 2.6 times wider, thin soft photon ring, bent starlight ----------------
  bh() {
    if (this.cache.bh) return this.cache.bh; const T = this.T; const g = new T.Group(); const face = new T.Group(); g.add(face);
    const RH = 15, RS = RH * 2.6;   // drawn at 30 km of horizon radius (3 km per Sun of mass, 10 Sun example); shadow 2.6 x horizon
    const ring = new T.Mesh(new T.PlaneGeometry(2, 2), photonRingMat(T, this.lut)); ring.scale.setScalar(RS * 1.35); ring.renderOrder = 3; face.add(ring);
    const pr = buildPhotonRing(91); const mp = this.mesh(pr, { additive: true }, 4); mp.scale.setScalar(RS); mp.material.uniforms.uAlpha.value = 0.55; face.add(mp);
    const ls = buildLensSources(41, 420); const ml = this.mesh(ls, { additive: true }, 2); ml.scale.setScalar(RS); face.add(ml);   /* round 7: a real point-lens map (strokeVert LENS), Einstein radius 1.5 shadow radii */
    const hor = this.dashedRing(RH, { color: 0xAACDFF, opacity: 0.85 }); hor.rotation.x = Math.PI / 2; hor.renderOrder = 5; face.add(hor);
    const swapStar = this.glow([[RH * 2.2, 0.25], [RH * 1.2, 0.5], [RH * 0.8, 1.0]], { useTeff: true, order: 4 }); swapStar.material.uniforms.uTeff.value = 30000; g.add(swapStar);
    const ringA0 = 0.55;
    const coR = this.callout("Bent light ring", { sub: "stars behind bend into arcs,\ndrawn much closer than real", side: 1 }), coH = this.callout("Horizon of a 10 Sun example", { sub: "about 30 km radius", side: 1 }); g.add(coR.grp, coH.grp);
    const sc = { root: g, kind: "bh", camDist: 125, radius: RS * 1.15, strokes: pr.n + ls.n, meshes: 5, kmPerUnit: () => 2,
      fit: () => ({ r: RS, frac: 230 / 1080, pfrac: 230 * 390 / 860 / 844 }),
      update: (c) => {
        face.quaternion.copy(c.camQuatLocal); const swap = !!c.st.toggles.swap;
        mp.material.uniforms.uAlpha.value = ringA0 * (1 + 0.08 * Math.sin(2 * Math.PI * (c.flowT || 0) / 6));   /* round 7: nothing spins; the thin ring only breathes in brightness (8%, 6 s) */ ring.visible = mp.visible = ml.visible = hor.visible = !swap; swapStar.visible = swap;
        const q = c.camQuatLocal; const rt = new T.Vector3(1, 0, 0).applyQuaternion(q), up = new T.Vector3(0, 1, 0).applyQuaternion(q);
        coR.set(swap ? "A star with the same mass" : "Bent light ring", swap ? "size not to scale" : "stars behind bend into arcs,\ndrawn much closer than real");
        coR.place(new T.Vector3().addScaledVector(rt, RS * 0.62).addScaledVector(up, RS * 0.8), RS * 0.45, RS * 0.25, q, 0.6);
        coH.grp.visible = !swap; coH.place(new T.Vector3().addScaledVector(rt, RH * 0.6).addScaledVector(up, -RH * 0.8), RS * 0.75, -RS * 0.25, q, 0.6);
      } };
    this.cache.bh = sc; return sc;
  }

  // ---------------- 40 Suns, V5: two possible deaths side by side (not to scale) ----------------
  twopaths() {
    if (this.cache.two) return this.cache.two; const T = this.T; const g = new T.Group();
    const left = new T.Group(), right = new T.Group(); left.position.set(-22, 0, 0); right.position.set(22, 0, 0); g.add(left, right);
    const db = buildDebris(63, 900); const md = this.mesh(db, { additive: true }, 2); const shell = new T.Group(); shell.add(md); left.add(shell);
    const flash = this.glow([[30, 0.3, [255, 250, 245]], [10, 0.7, [255, 255, 255]], [3, 1, [255, 255, 255]]], { useTeff: false, order: 4 }); left.add(flash);
    const starR = this.glow([[8, 0.2], [3.5, 0.6], [1.6, 1.0]], { useTeff: true, order: 3 }); starR.material.uniforms.uTeff.value = 4800; right.add(starR);
    const starL = this.glow([[8, 0.2], [3.5, 0.6], [1.6, 1.0]], { useTeff: true, order: 3 }); starL.material.uniforms.uTeff.value = 4800; left.add(starL);
    const holes = [left, right].map((p) => { const d = new T.Mesh(new T.CircleGeometry(1, 48), new T.MeshBasicMaterial({ color: 0, depthTest: false, depthWrite: false, transparent: true })); d.renderOrder = 6; d.scale.setScalar(2); p.add(d); return d; });
    const lL = this.label("Explode first", { size: 2 }), lR = this.label("Collapse quietly", { size: 2, sub: "little or no visible explosion" }); lL.position.set(-22, 16, 0); lR.position.set(22, 16, 0); g.add(lL, lR);
    const nts = this.label("Not to scale", { size: 1.4, color: "#C3C9E6" }); nts.position.set(0, -16, 0); g.add(nts);
    const sc = { root: g, kind: "twopaths", camDist: 80, radius: 30, strokes: db.n, meshes: 6, kmPerUnit: () => null,
      update: (c) => {
        const first = c.st.pathFirst || "Explode first"; const t = c.v.t; const tL = first === "Explode first" ? clamp(t / 0.5, 0, 1) : clamp((t - 0.5) / 0.5, 0, 1); const tR = first === "Explode first" ? clamp((t - 0.5) / 0.5, 0, 1) : clamp(t / 0.5, 0, 1);
        shell.scale.setScalar(1 + 14 * tL); md.material.uniforms.uAlpha.value = smooth(0.02, 0.2, tL) * (1 - 0.5 * smooth(0.8, 1, tL));
        flash.material.uniforms.uAlpha.value = (this.reduced ? 0.4 : 1) * smooth(0, 0.06, tL) * (1 - smooth(0.1, 0.8, tL)); starL.material.uniforms.uAlpha.value = 1 - smooth(0, 0.06, tL);
        starR.material.uniforms.uAlpha.value = 1 - smooth(0.1, 0.8, tR); starR.scale.setScalar(1 - 0.6 * smooth(0, 0.8, tR));
        holes[0].material.opacity = smooth(0.5, 0.9, tL); holes[1].material.opacity = smooth(0.6, 1, tR);
        for (const h of holes) h.quaternion.copy(c.camQuatLocal);
      } };
    this.cache.two = sc; return sc;
  }

  get(kind, mass) {
    switch (kind) {
      case "cloud": case "collapse": return this.cloud();
      case "disk": case "ignite": return this.disk(mass);
      case "star": return this.star();
      case "cutaway": return this.cutaway();
      case "nebula": return this.nebula();
      case "wd": return this.wd();
      case "supernova": return this.supernova();
      case "ns": return this.ns();
      case "bh": return this.bh();
      case "twopaths": return this.twopaths();
      default: return null;
    }
  }
}
/** A soft flattened glow for the city's horizon (Leo's ns frame): a radial gradient on a camera-facing plane. */
function horizonGlow(T) {
  const c = document.createElement("canvas"); c.width = c.height = 128; const x = c.getContext("2d"); const gr = x.createRadialGradient(64, 64, 0, 64, 64, 64); gr.addColorStop(0, "rgba(165,185,255,0.95)"); gr.addColorStop(1, "rgba(127,152,232,0)"); x.fillStyle = gr; x.fillRect(0, 0, 128, 128);
  const tex = new T.CanvasTexture(c); const m = new T.Mesh(new T.PlaneGeometry(2, 2), new T.MeshBasicMaterial({ map: tex, transparent: true, depthTest: false, depthWrite: false, blending: T.AdditiveBlending })); m.renderOrder = 1; return m;
}
/** The black hole's shadow and photon ring in one premultiplied pass (Leo's bh frame): black inside 2.6 horizon radii, then three
 * narrow tents of warm light (temperatureToSRGB at 6,800 K, equal bleed toward white), no hard band. Unit: plane half-size = 1.35 shadow radii. */
function photonRingMat(T, lut) {
  return new T.ShaderMaterial({ uniforms: { uLut: { value: lut } }, transparent: true, depthTest: false, depthWrite: false, blending: T.CustomBlending, blendEquation: T.AddEquation, blendSrc: T.OneFactor, blendDst: T.OneMinusSrcAlphaFactor,
    vertexShader: "varying vec2 vU; void main(){ vU = position.xy; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }",
    fragmentShader: `precision highp float; varying vec2 vU; uniform sampler2D uLut;
      vec3 dec(vec3 c){ return mix(c / 12.92, pow((c + 0.055) / 1.055, vec3(2.4)), step(0.04045, c)); }
      vec3 tlin(float T){ float u = clamp((log(max(T, 1000.0)) / 2.302585 - 3.0) / 3.0, 0.0, 1.0); return dec(texture2D(uLut, vec2(u * (511.0 / 512.0) + 0.5 / 512.0, 0.5)).rgb); }
      float tent(float r, float a, float p, float b){ return r < p ? smoothstep(a, p, r) : 1.0 - smoothstep(p, b, r); }
      void main(){ float r = length(vU) * 1.35 * 230.0;   // in Leo's frame pixels: shadow radius 230 px
        float sh = 1.0 - smoothstep(229.0, 231.5, r);
        vec3 col = tlin(6800.0); vec3 hot = mix(col, vec3(1.0), 0.35);
        vec3 c = col * 0.07 * tent(r, 204.0, 234.0, 276.0) + col * 0.24 * tent(r, 220.0, 233.0, 250.0) + hot * 0.19 * tent(r, 226.0, 232.0, 239.0);
        float m = max(c.r, max(c.g, c.b)); if (m > 1.0) { float w = 0.9 * (m - 1.0); c = (c / m + vec3(w)) / (1.0 + w); }
        float a = max(sh, clamp(m, 0.0, 1.0)); if (a < 0.002) discard;
        vec3 e = mix(c * 12.92, 1.055 * pow(max(c, 0.0), vec3(1.0 / 2.4)) - 0.055, step(0.0031308, c));
        gl_FragColor = vec4(e * (1.0 - sh * 0.0), a); }` });
}
/** Orbit labels on the giant stages, as in Leo's style B frames (S2 Earth line exactly as v2.4). */
function orbitText(id, n) {
  if (n === "Earth") return id === "S2" ? ["Earth's orbit, just outside the surface.", "Tides may still drag Earth in (predicted)."] : id === "H2" ? ["Earth's orbit, 1 AU", "would be deep inside"] : ["Earth's orbit", "1 AU"];
  return { Mercury: ["Mercury's orbit", "0.39 AU"], Venus: ["Venus's orbit", "0.72 AU"], Jupiter: ["Jupiter's orbit", "5.2 AU"] }[n] || [n, ""];
}
function tRGB255Peek(choice) { return choice === "yellow" ? hex2rgb("#FFE45C") : choice === "orange" ? hex2rgb("#FFA64A") : tRGB255(5772); }

/** A nice scale-bar length for a scene unit (km per world unit): returns { units, label }. */
export function scaleBar(kmPerUnit, target = 8) {
  if (!kmPerUnit) return null;
  const km = kmPerUnit * target; let unit, div, name;
  if (km < 2e5) { unit = 1; name = "km"; } else if (km < 3e7) { unit = KM.RSUN; name = "Sun radius"; } else if (km < 3e11) { unit = KM.AU; name = "AU"; } else { unit = KM.LY; name = "light-year"; }
  const v = km / unit; const p = Math.pow(10, Math.floor(Math.log10(v))); const n = [1, 2, 5, 10].map((k) => k * p).reduce((a, b) => (Math.abs(Math.log(b / v)) < Math.abs(Math.log(a / v)) ? b : a));
  const nn = +n.toPrecision(2); const plural = nn === 1 ? name : name === "Sun radius" ? "Sun radii" : name + "s";
  const lab = name === "km" ? `${nn.toLocaleString("en-US")} km` : name === "AU" ? `${nn.toLocaleString("en-US")} AU` + (nn === 1 ? " (Earth to Sun)" : "") : `${nn.toLocaleString("en-US")} ${plural}`;
  return { units: nn * unit / kmPerUnit, label: lab };
}
/** Teaching spec v1.4: "Zoomed out N times. Watch the scale bar." Only for a change of 2 times or more; N has 1 or 2
 * significant figures, and "about" is added when N is rounded. */
export const ZOOM_MIN = 2;
export function zoomText(oldK, newK) {
  if (!oldK || !newK) return ""; const r = oldK / newK; const f = r > 1 ? r : 1 / r; if (!(f >= ZOOM_MIN - 1e-9)) return "";
  const sig = f < 10 ? 1 : 2; const e = Math.floor(Math.log10(f)); const p = Math.pow(10, e - sig + 1); const n = Math.round(f / p) * p;
  const big = [[1e12, "trillion"], [1e9, "billion"], [1e6, "million"]].find(([v]) => n >= v); const s = big ? `${+(n / big[0]).toPrecision(2)} ${big[1]}` : Math.round(n).toLocaleString("en-US");
  const ab = Math.abs(f / n - 1) < 0.002 ? "" : "about ";   // exact zoom steps (10, 100, ...) read without "about"
  return `${r > 1 ? "Zoomed in" : "Zoomed out"} ${ab}${s} times. Watch the scale bar.`;
}
