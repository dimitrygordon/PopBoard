// Stellar Life Cycle VR: shared scene helpers (painted sky, hub glows, 3D labels, scale bar and zoom labels).
// v2: the per-stage scenes are retired. The whole life is one continuous world in sl-world.js; its kmPerUnit
// drives the scale bar and the "Zoomed in / out N times" labels (never a fake scale).
import { buildSky, spriteGeometry, lutData } from "./sl-strokes.js";
import { about } from "./sl-data.js";
import { strokeVert, strokeFrag, spriteVert, spriteFrag, bgVert, bgFrag, glowVert, glowFrag } from "./sl-shaders.js";

export const KM = { RSUN: 695700, AU: 1.495978707e8, LY: 9.4607e12, REARTH: 6371 };
const LABEL_K = 1.9;   // labels read at about 2 to 3 percent of the view height on desktop and in the headset
const clamp = (v, a, b) => Math.max(a, Math.min(b, v));

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
    // the sky is transparent, so it draws after the opaque star: depth-test it (it sits far behind everything) so no sky stroke paints over a star
    for (const o of [sm, sp]) { o.material.depthTest = true; o.material.depthWrite = false; }
    g.add(bg, sm, sp); this.counts.sky = sky.n; this.cache.bg = { root: g, strokes: sky.n, meshes: 3 }; return this.cache.bg;
  }

}

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
