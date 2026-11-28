// Stellar Life Cycle VR: the painted 3D scenes. Each scene is a few merged stroke meshes (a handful of draw calls)
// plus a glow billboard, built lazily on first use and cached. Every size is to scale inside its scene; the
// scene's kmPerUnit drives the scale bar and the "now N times smaller / bigger" zoom labels (never a fake scale).
import { buildSky, buildCloud, buildDisk, buildStar, buildWind, buildOnion, ONION, buildNebula, buildDebris, buildEarth, buildCity, buildPhotonRing, spriteGeometry, lutData, tRGB255, hex2rgb } from "./sl-strokes.js";
import { strokeVert, strokeFrag, spriteVert, spriteFrag, bgVert, bgFrag, glowVert, glowFrag } from "./sl-shaders.js";

export const KM = { RSUN: 695700, AU: 1.495978707e8, LY: 9.4607e12, REARTH: 6371 };
const LABEL_K = 1.9;   // labels read at about 2 to 3 percent of the view height on desktop and in the headset
const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
const smooth = (a, b, x) => { const t = clamp((x - a) / (b - a), 0, 1); return t * t * (3 - 2 * t); };

export class Scenes {
  constructor(THREE, uni) {
    this.T = THREE; this.uni = uni; this.cache = {}; this.counts = {};
    const { data, N } = lutData(); this.lut = new THREE.DataTexture(data, N, 1, THREE.RGBAFormat); this.lut.magFilter = THREE.LinearFilter; this.lut.minFilter = THREE.LinearFilter; this.lut.needsUpdate = true;
    this.root = new THREE.Group();
    this.reduced = typeof matchMedia === "function" && matchMedia("(prefers-reduced-motion: reduce)").matches;
  }
  mat({ additive = false, star = false, own = {} } = {}) {
    const T = this.T;
    const u = { ...this.uni, uAlpha: { value: 1 }, uLut: { value: this.lut }, uTeff: { value: 5772 }, uExposure: { value: 1 }, uPeek: { value: new T.Vector3(1, 1, 1) }, uPeekOn: { value: 0 }, uWind: { value: 0 }, uWindLen: { value: 0.6 }, uPull: { value: 1 }, uLayerA: { value: [1, 1, 1, 1, 1, 1, 1] }, ...own };
    const defines = {}; if (additive) defines.ADDITIVE = 1; if (star) defines.STAR = 1;
    return new T.ShaderMaterial({ vertexShader: strokeVert, fragmentShader: strokeFrag, uniforms: u, defines, transparent: true, depthTest: false, depthWrite: false, side: T.DoubleSide,
      ...(additive ? { blending: T.CustomBlending, blendEquation: T.AddEquation, blendSrc: T.OneFactor, blendDst: T.OneFactor, blendSrcAlpha: T.OneFactor, blendDstAlpha: T.OneFactor } : { blending: T.NormalBlending, premultipliedAlpha: true }) });
  }
  mesh(builder, opts = {}, order = 1) { const m = new this.T.Mesh(builder.geometry(this.T), this.mat(opts)); m.frustumCulled = false; m.renderOrder = order; m.userData.strokes = builder.n; return m; }
  glow(layers, { disc = 0, useTeff = true, order = 3 } = {}) {
    const T = this.T; const maxR = Math.max(...layers.map((l) => l[0]), disc * 1.02);
    const lay = []; const rad = []; for (let i = 0; i < 5; i++) { const l = layers[i] || [1e-3, 0, [0, 0, 0]]; const c = l[2] || [255, 255, 255]; lay.push(new T.Vector4(c[0] / 255, c[1] / 255, c[2] / 255, l[1])); rad.push(l[0]); }
    const m = new T.Mesh(new T.PlaneGeometry(2, 2), new T.ShaderMaterial({ vertexShader: glowVert, fragmentShader: glowFrag,
      uniforms: { ...this.uni, uMaxR: { value: maxR }, uLay: { value: lay }, uRad: { value: rad }, uLut: { value: this.lut }, uTeff: { value: 5772 }, uDisc: { value: disc }, uExposure: { value: 1 }, uAlpha: { value: 1 }, uPeek: { value: new T.Vector3(1, 1, 1) }, uPeekOn: { value: 0 }, uUseTeff: { value: useTeff ? 1 : 0 } },
      transparent: true, depthTest: false, depthWrite: false, side: T.DoubleSide, blending: T.NormalBlending, premultipliedAlpha: true }));
    m.frustumCulled = false; m.renderOrder = order; return m;
  }
  sprites(list, order = 6) {
    const T = this.T; const m = new T.Mesh(spriteGeometry(T, list), new T.ShaderMaterial({ vertexShader: spriteVert, fragmentShader: spriteFrag, uniforms: { ...this.uni, uAlpha: { value: 1 } }, transparent: true, depthTest: false, depthWrite: false, side: T.DoubleSide,
      blending: T.CustomBlending, blendEquation: T.AddEquation, blendSrc: T.OneFactor, blendDst: T.OneFactor, blendSrcAlpha: T.OneFactor, blendDstAlpha: T.OneFactor }));
    m.frustumCulled = false; m.renderOrder = order; return m;
  }
  // text label as a camera-facing sprite (world-sized so it scales with the scene); redraw only when the text changes
  label(text, { size = 3, color = "#FFFFFF", sub = "", plate = true } = {}) {
    const T = this.T; const c = document.createElement("canvas"); c.width = 1024; c.height = 256;
    const tex = new T.CanvasTexture(c); tex.colorSpace = T.SRGBColorSpace; tex.minFilter = T.LinearFilter; tex.generateMipmaps = false;
    const sp = new T.Sprite(new T.SpriteMaterial({ map: tex, transparent: true, depthTest: false, depthWrite: false, toneMapped: false }));
    sp.renderOrder = 40; sp.center.set(0.5, 0.5); sp.userData = { c, tex, text: null, size, color, plate };
    this.setLabel(sp, text, sub); return sp;
  }
  setLabel(sp, text, sub = "") {
    const d = sp.userData; const key = text + "|" + sub; if (d.text === key) return; d.text = key;
    const g = d.c.getContext("2d"); g.clearRect(0, 0, 1024, 256); if (!text) { sp.visible = false; d.tex.needsUpdate = true; return; } sp.visible = true;
    g.font = "650 76px Inter, -apple-system, system-ui, sans-serif"; const w1 = g.measureText(text).width; g.font = "500 58px Inter, -apple-system, system-ui, sans-serif"; const w2 = sub ? g.measureText(sub).width : 0;
    const w = Math.min(1000, Math.max(w1, w2) + 60), h = sub ? 190 : 116, x0 = (1024 - w) / 2, y0 = (256 - h) / 2;
    if (d.plate) { g.fillStyle = "rgba(8,10,24,0.62)"; g.beginPath(); g.roundRect ? g.roundRect(x0, y0, w, h, 40) : g.rect(x0, y0, w, h); g.fill(); }
    g.textAlign = "center"; g.fillStyle = d.color; g.font = "650 76px Inter, -apple-system, system-ui, sans-serif"; g.fillText(text, 512, y0 + 84, 980);
    if (sub) { g.fillStyle = "#C3C9E6"; g.font = "500 58px Inter, -apple-system, system-ui, sans-serif"; g.fillText(sub, 512, y0 + 156, 980); }
    d.tex.needsUpdate = true; sp.scale.set(d.size * 4 * LABEL_K, d.size * LABEL_K, 1);
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
    const sc = { root: g, kind: "cloud", kmPerUnit: () => 0.1 * KM.LY, camDist: 80, radius: 30, strokes: vis.n + fil.n, meshes: 3, label: this.label("", { size: 3 }),
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
    const sp = D.sprites.length ? this.sprites(D.sprites, 4) : null;
    g.add(md, ma, core); if (sp) g.add(sp); if (mw) g.add(mw);
    const frost = D.frost ? new T.Group() : null; if (frost) g.add(frost);   // the frost line is painted into the disk (v4); this group only carries the label
    const lab = this.label("", { size: 1.6 }); const flab = planets === "solar" ? this.label("Frost line, about 3 AU", { size: 1.1, color: "#AACDFF" }) : null;
    g.add(lab); if (flab) { flab.position.set(3.5, 1.1, 0); g.add(flab); }
    const coreHot = this.glow([[1.6, 0.9, [255, 255, 255]], [0.7, 1.0, [255, 255, 255]]], { useTeff: false, order: 7 }); coreHot.visible = false; g.add(coreHot);
    // painter's sort of the disk strokes, back to front (from the tech test)
    const dg = md.geometry, meta = dg.userData, nS = meta.count, per = meta.per;
    const cr = new Float32Array(nS); for (let i = 0; i < nS; i++) cr[i] = Math.hypot(meta.cent[3 * i], meta.cent[3 * i + 2]) + 1e-3;
    const idxAttr = dg.getIndex(), idxArr = idxAttr.array, baseIdx = meta.baseIndex; const keys = new Float32Array(nS), order = Array.from({ length: nS }, (_, i) => i);
    let lastSort = -1e9;
    const resort = (camLocal) => {
      const ft = this.uni.uFlowT.value, cc = meta.cent, om = meta.omega, kd = meta.kinds, tl = ft / 4;
      for (let i = 0; i < nS; i++) { const r = cr[i]; let a = 0; if (kd[i] === 3) a = (44 / 32) / r * (((tl + om[i]) % 1 + 1) % 1); else a = (7 / 32) / r * Math.sin(2 * Math.PI * tl - 1.05 * r);
        const ca = Math.cos(a), sa = Math.sin(a), x = cc[3 * i] * ca + cc[3 * i + 2] * sa, z = -cc[3 * i] * sa + cc[3 * i + 2] * ca, y = cc[3 * i + 1]; const dx = x - camLocal.x, dy = y - camLocal.y, dz = z - camLocal.z; keys[i] = dx * dx + dy * dy + dz * dz; }
      order.sort((a, b) => keys[b] - keys[a]); for (let k = 0; k < nS; k++) { const s = order[k]; idxArr.set(baseIdx.subarray(s * per, s * per + per), k * per); } idxAttr.needsUpdate = true;
    };
    const sc = { root: g, kind: "disk", kmPerUnit: () => KM.AU, camDist: 50, radius: 19, strokes: D.disk.n + D.add.n + (massive ? D.wrap.n : 0), meshes: 4 + (sp ? 1 : 0) + (mw ? 1 : 0), bodies: D.bodies,
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
        if (frost) frost.visible = id === "F3" || id === "F4"; if (flab) flab.visible = !!frost && frost.visible;
        this.setLabel(lab, id === "F3" ? "Protostar" : id === "F4" ? (mass === "1" ? "Young star (T Tauri)" : "Young star") : "Fusion starts in the core", id === "F5" ? "about 10 million K" : "");
        lab.position.set(0, 4.2, 0);
        if (c.now - lastSort > 120) { resort(c.camLocal); lastSort = c.now; }
      } };
    this.cache[key] = sc; return sc;
  }

  // ---------------- stars: main sequence, giants and supergiants (units: zoomed, s Suns of radius per unit) ----------------
  star() {
    if (this.cache.star) return this.cache.star; const T = this.T; const g = new T.Group(); const body = new T.Group(); g.add(body);
    const sb = buildStar(21); const wb = buildWind(31, 300);
    const halo = this.glow([[2.4, 0.07], [1.6, 0.16], [1.22, 0.26], [1.04, 0.22], [0.5, 0.0]], { disc: 1.0, useTeff: true, order: 1 });
    const ms = this.mesh(sb, { star: true }, 2); const mw = this.mesh(wb, { star: true, additive: true }, 3);
    body.add(halo, ms, mw);
    const ref = this.dashedRing(1, { color: 0xFFF1EA, opacity: 0.85 }); ref.rotation.x = Math.PI / 2; g.add(ref);   // billboarded below
    const refLab = this.label("The Sun's size", { size: 1.3, color: "#FFF1EA" }); g.add(refLab);
    const lab = this.label("", { size: 2.2 }); g.add(lab);
    const orbits = {}; for (const [n, a] of [["Mercury", 0.387], ["Venus", 0.723], ["Earth", 1.0], ["Jupiter", 5.2]]) { const o = this.dashedRing(1, { color: 0xC3C9E6, opacity: 0.75 }); o.userData.a = a; const l = this.label(n, { size: 1.2, color: "#C3C9E6", plate: false }); g.add(o, l); orbits[n] = { o, l, a }; }
    const levels = [0.001, 0.01, 0.1, 1, 10, 100, 1000];
    const sc = { root: g, kind: "star", s: 1, camDist: 70, radius: 10, strokes: sb.n + wb.n, meshes: 3, body, ms, halo,
      kmPerUnit: () => sc.s * KM.RSUN,
      zoomFor(R) { let s = sc.s; if (R / s > 24 || R / s < 2.4) { s = levels.find((L) => R / L <= 24 && R / L >= 2.4) || levels.reduce((a, b) => (Math.abs(Math.log10(R / b / 8)) < Math.abs(Math.log10(R / a / 8)) ? b : a)); } return s; },
      reset(R) { sc.s = levels.find((L) => R / L <= 24 && R / L >= 2.4) || 1; },
      update: (c) => {
        const row = c.v.row; if (!row) return; const R = Math.pow(10, row.logR), Teff = Math.pow(10, row.logT);
        sc.s = sc.zoomFor(R); const r = R / sc.s; body.scale.setScalar(r); sc.radius = r;
        const exp = 1.0;
        for (const m of [ms, mw]) { m.material.uniforms.uTeff.value = Teff; m.material.uniforms.uExposure.value = exp; }
        halo.material.uniforms.uTeff.value = Teff; halo.material.uniforms.uExposure.value = 1.08;
        const giant = clamp((row.logR - 0.9) / 1.0, 0, 1); ms.material.uniforms.uGiant = ms.material.uniforms.uGiant || { value: 0 };
        // giant-cell look switches in smoothly as the star swells (stroke k mixes from fine cells to 8 giant cells)
        ms.material.uniforms.uMixG.value = giant;
        const peek = c.st.peek && c.st.answers["S1:0"]; const pk = peek ? tRGB255Peek(c.st.answers["S1:0"]) : null;
        for (const m of [ms, halo]) { m.material.uniforms.uPeekOn.value = pk ? 1 : 0; if (pk) m.material.uniforms.uPeek.value.set(pk[0] / 255, pk[1] / 255, pk[2] / 255); }
        const winds = !!(c.v.stage && c.v.stage.winds); mw.visible = winds; mw.material.uniforms.uWind.value = winds ? 1 : 0; mw.material.uniforms.uWindLen.value = 0.9;
        if (!c.calm) body.rotation.y += c.dt * 0.02;
        // the Sun-size reference ring (R1) and planet orbits (S2, S5, H2), all at the same scale as the star
        const st = c.v.stage || {}; ref.visible = refLab.visible = st.ref === "sunRing";
        if (ref.visible) { const rr = 1 / sc.s; ref.scale.setScalar(rr); ref.quaternion.copy(c.camQuatLocal); ref.rotateX(Math.PI / 2); refLab.position.copy(new T.Vector3(0, -rr - 1.6, 0).applyQuaternion(c.camQuatLocal)); }
        for (const [n, ob] of Object.entries(orbits)) {
          const on = (st.orbits || []).includes(n); ob.o.visible = ob.l.visible = on; if (!on) continue;
          const rr = ob.a * 215.032 / sc.s; ob.o.scale.setScalar(rr); ob.o.rotation.set(0.22, 0, 0); ob.l.position.set(rr * 0.71, -rr * 0.71 * Math.sin(0.22) - 0.8, rr * 0.71);
          ob.o.material.opacity = rr < r ? 0.45 : 0.8;
        }
        this.setLabel(lab, c.v.type, c.help >= 1 ? `${Math.round(Teff).toLocaleString("en-US")} K` : ""); lab.position.copy(new T.Vector3(0, r * 1.18 + 2.4, 0).applyQuaternion(c.camQuatLocal));
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
    const layLabs = ONION.map(([n]) => { const l = this.label(n, { size: 0.9, color: "#FFFFFF", plate: false }); face.add(l); return l; });
    const sc = { root: g, kind: "cutaway", camDist: 70, radius: 10, strokes: b.n + st.strokes, meshes: 2 + st.meshes, star: st,
      kmPerUnit: () => st.kmPerUnit(),
      update: (c) => {
        st.update(c); st.ms.material.uniforms.uAlpha.value = 0.32; st.halo.material.uniforms.uAlpha.value = 0.55;
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
        layLabs.forEach((l, i) => { l.visible = showCut && A[i] > 0.4 && (cut === "onion" || cut === "onionBars" || i <= 1 || (cut === "collapse" && i === 6)); l.position.set(0, (radii[i] + (radii[i + 1] || 0)) / 2, 0.02); l.scale.set(0.9 * 4 / R0 * 1.2, 0.9 / R0 * 1.2, 1); });
        lab.position.copy(new T.Vector3(0, -R0 - 1.8, 0).applyQuaternion(c.camQuatLocal)); key.position.copy(new T.Vector3(0, -R0 - 3.2, 0).applyQuaternion(c.camQuatLocal));
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

  // ---------------- white dwarf beside Earth, same scale (units: zoomed) ----------------
  wd() {
    if (this.cache.wd) return this.cache.wd; const T = this.T; const g = new T.Group(); const body = new T.Group(); g.add(body);
    const sb = buildStar(23, { broad: 200, medium: 520, hi: 0 }); const ms = this.mesh(sb, { star: true }, 2);
    ms.material.uniforms.uMixG = { value: 0 }; ms.material.vertexShader = ms.material.vertexShader.replace("uniform float uTeff;", "uniform float uTeff; uniform float uMixG;").replace("lin * aColor.r * ld", "lin * mix(aColor.r, aColor.b, uMixG) * ld").replace("tlin(uTeff + aColor.g * 1000.0 - 500.0)", "tlin(uTeff)");
    const halo = this.glow([[2.2, 0.06], [1.5, 0.14], [1.15, 0.22], [1.03, 0.2], [0.5, 0]], { disc: 1.0, useTeff: true, order: 1 }); body.add(halo, ms);
    const earth = new T.Group(); const eb = buildEarth(71); earth.add(this.mesh(eb, {}, 2)); g.add(earth);
    const labW = this.label("White dwarf", { size: 1.8 }), labE = this.label("Earth, same scale", { size: 1.5 }); g.add(labW, labE);
    const levels = [0.001, 0.002, 0.005, 0.01];
    const sc = { root: g, kind: "wd", body, s: 0.001, camDist: 70, radius: 14, strokes: sb.n + eb.n, meshes: 3, kmPerUnit: () => sc.s * KM.RSUN,
      update: (c) => {
        const row = c.v.cooling || c.v.row; if (!row) return; const R = Math.pow(10, row.logR), Teff = Math.pow(10, row.logT);
        if (R / sc.s > 24 || R / sc.s < 2.4) sc.s = levels.find((L) => R / L <= 24) || 0.01;
        const r = R / sc.s, re = 0.009158 / sc.s; body.scale.setScalar(r); earth.scale.setScalar(re);
        body.position.set(-r * 0.75 - 2, 0, 0); earth.position.set(re + 3, 0, 0); sc.radius = Math.max(r, re);
        ms.material.uniforms.uTeff.value = Teff; halo.material.uniforms.uTeff.value = Teff; halo.material.uniforms.uExposure.value = 1.1;
        const pred = c.st.mass === "0.2";
        this.setLabel(labW, pred ? "Helium white dwarf (predicted)" : "White dwarf", c.help >= 1 ? `${Math.round(Teff).toLocaleString("en-US")} K` : "");
        labW.position.set(body.position.x, r + 2.4, 0); labE.position.set(earth.position.x, re + 2.0, 0);
      } };
    this.cache.wd = sc; return sc;
  }

  // ---------------- supernova (units: 10 AU). Debris radius = 10,000 km/s x time ----------------
  supernova() {
    if (this.cache.sn) return this.cache.sn; const T = this.T; const g = new T.Group();
    const db = buildDebris(61, 1700); const md = this.mesh(db, { additive: true }, 2); const shell = new T.Group(); shell.add(md); g.add(shell);
    const flash = this.glow([[60, 0.25, [255, 250, 245]], [24, 0.55, [255, 250, 245]], [8, 1.0, [255, 255, 255]], [2, 1.0, [255, 255, 255]]], { useTeff: false, order: 5 }); g.add(flash);
    const prog = this.glow([[1.2, 0.5], [0.45, 1.0]], { useTeff: true, order: 3 }); prog.material.uniforms.uTeff.value = 3300; g.add(prog);
    const lab = this.label("", { size: 1.8 }); g.add(lab);
    const sc = { root: g, kind: "supernova", camDist: 75, radius: 18, strokes: db.n, meshes: 3, kmPerUnit: () => 10 * KM.AU,
      update: (c) => {
        const t = c.v.t; const days = 1 + 34 * t; const rUnits = 10000 * 86400 * days / (10 * KM.AU); shell.scale.setScalar(rUnits); sc.radius = Math.max(rUnits, 3);
        const peak = this.reduced ? 0.6 * smooth(0, 0.3, t) * (1 - smooth(0.5, 1, t)) : smooth(0, 0.05, t) * (1 - smooth(0.1, 0.9, t) * 0.85);
        flash.material.uniforms.uAlpha.value = peak; flash.scale.setScalar(0.5 + 0.8 * Math.sqrt(t)); prog.visible = t < 0.04;
        md.material.uniforms.uAlpha.value = smooth(0.02, 0.15, t);
        c.extra.snDays = days;
        this.setLabel(lab, `${Math.round(days)} days after the collapse`, "debris at about 10,000 km/s"); lab.position.set(0, rUnits * 1.1 + 3, 0);
      } };
    this.cache.sn = sc; return sc;
  }

  // ---------------- neutron star over a city, same scale (units: km) ----------------
  ns() {
    if (this.cache.ns) return this.cache.ns; const T = this.T; const g = new T.Group(); const body = new T.Group(); g.add(body);
    const sb = buildStar(25, { broad: 220, medium: 600, hi: 0 }); const ms = this.mesh(sb, { star: true }, 3);
    ms.material.vertexShader = ms.material.vertexShader.replace("tlin(uTeff + aColor.g * 1000.0 - 500.0)", "tlin(uTeff)");
    // LOOK-SPEC 3.4: surface 1,000,000 K (#95B1FF at the edge), white-hot core by the equal bleed (exposure > 1), thin ring
    const halo = this.glow([[3.0, 0.07], [1.7, 0.16], [1.12, 0.32], [1.02, 0.3], [0.6, 0]], { disc: 1.0, useTeff: true, order: 2 }); body.add(halo, ms);
    const cb = buildCity(81, 0); const city = this.mesh(cb, {}, 5); g.add(city);
    const rem = buildNebula(53); const mr = this.mesh(rem, { additive: true }, 0); mr.scale.setScalar(260); mr.position.set(0, 40, -700); mr.material.uniforms.uAlpha.value = 0.35; g.add(mr);
    const labN = this.label("Neutron star", { size: 2.0 }), labC = this.label("City, same scale", { size: 1.6, sub: "20 km across" }), labR = this.label("Supernova remnant", { size: 6, sub: "far behind, not to scale" }); labR.position.set(0, 250, -700); g.add(labN, labC, labR);
    const sc = { root: g, kind: "ns", camDist: 62, radius: 14, strokes: sb.n + cb.n + rem.n, meshes: 4, kmPerUnit: () => 1,
      update: (c) => {
        body.scale.setScalar(12); body.position.set(0, 16, 0); city.position.set(0, -1.5, 0);
        ms.material.uniforms.uTeff.value = 1e6; ms.material.uniforms.uExposure.value = 1.0; halo.material.uniforms.uTeff.value = 1e6; halo.material.uniforms.uExposure.value = 1.9;
        labN.position.set(0, 31, 0); labC.position.set(0, -5.5, 0);
      } };
    this.cache.ns = sc; return sc;
  }

  // ---------------- black hole with its ring of bent light (units: 2 km) and the pull test ----------------
  bh() {
    if (this.cache.bh) return this.cache.bh; const T = this.T; const g = new T.Group(); const face = new T.Group(); g.add(face);
    const RH = 15;   // drawn at 30 km of horizon radius, the middle of "about 15 to 60 km" (3 km per Sun of mass)
    const disc = new T.Mesh(new T.CircleGeometry(1, 64), new T.MeshBasicMaterial({ color: 0x000000, depthTest: false, depthWrite: false })); disc.renderOrder = 3; disc.scale.setScalar(RH * 1.0); face.add(disc);
    const pr = buildPhotonRing(91); const mp = this.mesh(pr, { additive: true }, 2); mp.scale.setScalar(RH); face.add(mp);
    const glowR = this.glow([[RH * 4, 0.12, [180, 200, 255]], [RH * 2.8, 0.18, [200, 214, 255]]], { useTeff: false, order: 1 }); face.add(glowR);
    const swapStar = this.glow([[RH * 2.2, 0.25], [RH * 1.2, 0.5], [RH * 0.8, 1.0]], { useTeff: true, order: 4 }); swapStar.material.uniforms.uTeff.value = 30000; g.add(swapStar);
    const orbit = this.dashedRing(90, { color: 0xC3C9E6, opacity: 0.6 }); orbit.rotation.x = 0.35; g.add(orbit);
    const planet = new T.Group(); const pb = buildEarth(73); planet.add(this.mesh(pb, {}, 6)); planet.scale.setScalar(2.2); g.add(planet);
    const labB = this.label("Black hole", { size: 2.2, sub: "horizon: about 3 km of radius for each Sun of mass" }), labP = this.label("Planet, far away", { size: 1.6, sub: "not to scale" }); g.add(labB, labP);
    const sc = { root: g, kind: "bh", camDist: 125, radius: RH * 1.8, strokes: pr.n + pb.n, meshes: 5, kmPerUnit: () => 2,
      update: (c) => {
        face.quaternion.copy(c.camQuatLocal); const swap = !!c.st.toggles.swap; disc.visible = mp.visible = glowR.visible = !swap; swapStar.visible = swap;
        const a = (c.time * 0.12) % (Math.PI * 2); planet.position.set(Math.cos(a) * 90, Math.sin(a) * 90 * Math.sin(0.35) * -1 * 0, -Math.sin(a) * 90); planet.position.applyAxisAngle(new T.Vector3(1, 0, 0), 0.35);
        this.setLabel(labB, swap ? "A star with the same mass" : "Black hole", swap ? "size not to scale" : "horizon: about 3 km of radius for each Sun of mass");
        labB.position.set(0, RH * 2.2 + 4, 0); labP.position.copy(planet.position).add(new T.Vector3(0, 6, 0));
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
export function zoomText(oldK, newK) {
  if (!oldK || !newK) return ""; const r = oldK / newK; if (Math.abs(Math.log10(r)) < 0.05) return "";
  const f = r > 1 ? r : 1 / r; const p = Math.pow(10, Math.floor(Math.log10(f))); const n = Math.round(f / p) * p; const s = n >= 1e6 ? `${+(n / 1e6).toPrecision(2)} million` : n.toLocaleString("en-US");
  const ab = Math.abs(f / n - 1) < 0.02 ? "" : "about ";   // exact zoom steps (10, 100, ...) read without "about"
  return r > 1 ? `Zoomed in: now ${ab}${s} times bigger` : `Zoomed out: now ${ab}${s} times smaller`;
}
