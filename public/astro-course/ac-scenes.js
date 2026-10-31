// Inside-the-slide 3D scenes (storybook v2, immersive pages), in colored pencil: the drawings are
// cutouts of the original slide art, lines are wobbly pencil strokes on paper sheets, nothing is lit
// or glossy. Reveal order: pencil lines, then the colored art, then labels.
import { pencilTexture } from "./ac-pop3d.js";
import { touchHints } from "./ac-touch.js";


// A billboard label: canvas text on a sprite anchored at its left edge so it can write on left to right.
// "_{g}" and "^{2}" mark subscript and superscript runs (force vectors are F_{g}, never Fg).
export function label(T, text, o = {}) {
  const dark = document.documentElement.dataset.theme === "dark";
  const px = 72, c = document.createElement("canvas"), g = c.getContext("2d");
  const fontAt = (k) => `${o.bold ? "700 " : ""}${Math.round(px * k)}px "Patrick Hand", "Comic Sans MS", sans-serif`;
  const runs = []; text.replace(/([_^])\{([^}]*)\}|([^_^]+|[_^])/g, (m, mk, inner, plain) => { runs.push(mk ? { t: inner, k: 0.62, dy: mk === "_" ? 0.28 : -0.32 } : { t: plain, k: 1, dy: 0 }); return m; });
  const widthOf = (r) => { g.font = fontAt(r.k); return g.measureText(r.t).width; };
  const w = Math.ceil(runs.reduce((a, r) => a + widthOf(r) + (r.k < 1 ? px * 0.06 : 0), 0)) + 24;
  c.width = w; c.height = Math.round(px * 1.6);
  g.textBaseline = "middle"; g.lineJoin = "round";
  // a paper-colored halo keeps labels readable over bright objects such as the Sun
  for (const pass of ["stroke", "fill"]) {
    let x = 12;
    for (const r of runs) {
      g.font = fontAt(r.k); const y = c.height / 2 + r.dy * px;
      if (pass === "stroke") { g.lineWidth = 12 * r.k; g.strokeStyle = dark ? "rgba(30,36,51,0.85)" : "rgba(246,239,223,0.9)"; g.strokeText(r.t, x, y); }
      else { g.fillStyle = o.color || (dark ? "#F3EAD7" : "#3d3d3d"); g.fillText(r.t, x, y); }
      x += g.measureText(r.t).width + (r.k < 1 ? px * 0.06 : 0);
    }
  }
  const tex = new T.CanvasTexture(c); tex.colorSpace = T.SRGBColorSpace;
  const m = new T.SpriteMaterial({ map: tex, transparent: true, depthWrite: false, depthTest: false, fog: false });
  const sp = new T.Sprite(m); sp.center.set(0, 0.5);
  let h = o.h || 0.4, wd = h * c.width / c.height; if (o.maxW && wd > o.maxW) { h *= o.maxW / wd; wd = o.maxW; }
  sp.scale.set(wd, h, 1); sp.userData.w = wd; sp.renderOrder = 10;
  return sp;
}
// centered billboard for scene labels
let PHONE = false;
function tag(T, text, o) { const sp = label(T, text, PHONE && !o.raw ? { ...o, h: (o.h || 0.4) * 1.45 } : o); sp.center.set(0.5, 0.5); return sp; }

// ---- colored-pencil kit (Leo's style kit: palette sampled from the D01 art, hatch tile, paper grain) ----
export const KIT = { paper: "#F7F6F2", graphite: "#403D42", dash: "#454545", fill: "#CFCFCF", red: "#BB3428", label: "#3D3D3D", label2: "#6B6B6B", darkInk: "#F3EAD7" };
const imgs = new Map();
function img(url) { if (!imgs.has(url)) imgs.set(url, new Promise((ok) => { const im = new Image(); im.onload = () => ok(im); im.onerror = () => ok(null); im.src = url; })); return imgs.get(url); }
function canvasTex(T, c) { const t = new T.CanvasTexture(c); t.colorSpace = T.SRGBColorSpace; t.anisotropy = 8; return t; } // mipmaps stay on
// A drawing cut out of the original slide art (rect in 1600x900 page px), as a camera-facing paper cutout.
// clean(r,g,b) -> replacement [r,g,b] or null strips baked marks (e.g. the red arrows on the s17 masses).
function cutout(T, url, rect, h, { round = false, clean = null } = {}) {
  const [x, y, w, hh] = rect, c = document.createElement("canvas"); c.width = w; c.height = hh;
  const tex = canvasTex(T, c), sp = new T.Sprite(new T.SpriteMaterial({ map: tex, transparent: true, depthWrite: false }));
  sp.scale.set(h * w / hh, h, 1);
  img(url).then((im) => {
    if (!im) return; const g = c.getContext("2d");
    if (round) { g.beginPath(); g.ellipse(w / 2, hh / 2, w / 2, hh / 2, 0, 0, Math.PI * 2); g.clip(); }
    g.drawImage(im, x * im.width / 1600, y * im.height / 900, w * im.width / 1600, hh * im.height / 900, 0, 0, w, hh);
    if (clean) { const d = g.getImageData(0, 0, w, hh); for (let k = 0; k < d.data.length; k += 4) { const r = clean(d.data[k], d.data[k + 1], d.data[k + 2]); if (r) d.data.set(r, k); } g.putImageData(d, 0, 0); }
    tex.needsUpdate = true;
  });
  return sp;
}
// A pencil stroke: low-frequency wobble (about 1 px at 1600 px) and 80 to 100 percent pressure, two passes.
function pencil(g, pts, color, w, { dash = null } = {}) {
  g.save(); g.lineCap = "round"; g.lineJoin = "round"; g.strokeStyle = color; if (dash) g.setLineDash(dash);
  for (let pass = 0; pass < 2; pass++) {
    const ph = Math.random() * 6.28; g.globalAlpha = 0.8 + Math.random() * 0.2; g.lineWidth = w * (pass ? 0.6 : 1);
    g.beginPath(); pts.forEach(([x, y], i) => { const o = Math.sin(i * 0.35 + ph) * w * 0.3; i ? g.lineTo(x + o, y - o) : g.moveTo(x + o, y - o); }); g.stroke();
  }
  g.restore();
}
const seg = (a, b, n = 24) => Array.from({ length: n + 1 }, (_, i) => [a[0] + (b[0] - a[0]) * i / n, a[1] + (b[1] - a[1]) * i / n]);
// A flat drawn sheet: draw(g, w, h, hatch) paints into a canvas; hatch is the kit tile as a pattern (or null).
function sheet(T, wW, hW, ppu, draw, kitBase) {
  const c = document.createElement("canvas"); c.width = Math.round(wW * ppu); c.height = Math.round(hW * ppu);
  const tex = canvasTex(T, c), m = new T.Mesh(new T.PlaneGeometry(wW, hW), new T.MeshBasicMaterial({ map: tex, transparent: true, depthWrite: false, side: T.DoubleSide }));
  const paint = (hatch) => { const g = c.getContext("2d"); g.clearRect(0, 0, c.width, c.height); draw(g, c.width, c.height, hatch); tex.needsUpdate = true; };
  paint(null); if (kitBase) img(kitBase + "hatch-tile-512.webp").then((im) => im && paint(c.getContext("2d").createPattern(im, "repeat")));
  return m;
}
function lights(T, g) { g.add(new T.AmbientLight(0xffffff, 1.5)); const d = new T.DirectionalLight(0xfff2d8, 1.3); d.position.set(-4, 6, 8); g.add(d); }

// Sketch-in for every element under root: lines draw on, solids wireframe then hatch, sprites write on.
function sketcher(root, delayOf = () => 0) {
  const els = []; root.traverse((o) => { if (o.userData.touchHint) return; if (o.isLine || o.isMesh || o.isPoints || o.isSprite) { o.material.transparent = true; els.push({ o, base: o.material.opacity ?? 1, n: o.isLine ? o.geometry.attributes.position.count : 0 }); } });
  return (t) => {
    for (const e of els) {
      const k = Math.max(0, Math.min(1, (t - delayOf(e.o)) / 0.6)), k2 = Math.max(0, Math.min(1, (t - delayOf(e.o) - 0.6) / 0.4));
      if (e.o.isLine) { e.o.geometry.setDrawRange(0, Math.max(2, Math.floor(e.n * k))); e.o.material.opacity = e.base * (k > 0 ? 1 : 0); }
      else if (e.o.isMesh && e.o.material.map) e.o.material.opacity = e.base * k;
      else if (e.o.isMesh) { e.o.material.wireframe = k < 1; e.o.material.opacity = e.base * (k < 1 ? k : 0.55 + 0.45 * k2); }
      else e.o.material.opacity = e.base * Math.min(k, 1) * (e.o.userData.fade ?? 1);
    }
  };
}

export function build(kind, T, scene, o) {
  const B = BUILDERS[kind]; if (!B) return null; PHONE = !!o.phone;
  const g = new T.Group(); scene.add(g);
  const th = touchHints(T, { still: o.still });
  const api = B(T, g, { ...o, touch: th }) || {};
  const sk = sketcher(g, api.delayOf || (() => 0)), inner = api.update || (() => {});
  api.update = (t, dt, cam) => { sk(o.still ? 99 : t); inner(t, dt, cam); th.update(t, dt); };
  api.interact = () => th.interact();
  api.dispose = () => g.traverse((m) => { if (m.material && m.material.map) m.material.map.dispose(); });
  return api;
}

const V = (T, x, y, z) => new T.Vector3(x, y, z);
const BUILDERS = {
  // P8: Powers of Ten as one fly-out through the original ladder: each rung's drawing, cut from the
  // slide, sits in a hand-drawn frame on its own depth layer, and the camera passes through them.
  powersFly(T, g, o) {
    const ink = o.dark ? KIT.darkInk : KIT.graphite;
    const STEPS = [["Earth", [800, 745, 100, 100]], ["Earth → Sun (1 AU)", [770, 632, 170, 85]], ["Sun → Neptune", [770, 495, 170, 105]], ["Sun → nearest star", [770, 383, 170, 70]], ["Milky Way", [800, 220, 110, 110]], ["Observable universe", [795, 95, 120, 110]]];
    const GAP = 7, layers = [];
    STEPS.forEach(([name, rect], i) => {
      const L = new T.Group(); L.position.z = -i * GAP; g.add(L); layers.push(L);
      // the ladder rung: graphite frame, light hatch inside with paper showing through
      L.add(sheet(T, 5.2, 3.6, 120, (c, w, h, hatch) => {
        const m = w * 0.03; if (hatch) { c.globalAlpha = o.dark ? 0.12 : 0.18; c.fillStyle = hatch; c.fillRect(m, m, w - 2 * m, h - 2 * m); c.globalAlpha = 1; }
        const P = [[m, m], [w - m, m], [w - m, h - m], [m, h - m], [m, m]]; for (let k = 0; k < 4; k++) pencil(c, seg(P[k], P[k + 1]), ink, w * 0.009);
      }, o.kit));
      const ar = rect[2] / rect[3], hgt = Math.min(1.9, 3.8 / ar), art = cutout(T, o.art, rect, hgt * 1.0, { round: i === 0 || i >= 4 }); art.position.set(0, 0.15, 0.05); L.add(art);
      const t2 = tag(T, name, { h: 0.36, color: o.dark ? KIT.darkInk : KIT.label }); t2.position.set(0, -1.45, 0.1); L.add(t2);
    });
    const total = (STEPS.length - 1) * GAP, ctl = o.controls || {};
    let z = 4, auto = true, set = null;
    if (ctl.onPower) ctl.onPower(STEPS.map((s) => s[0]), (v) => { set = v; auto = false; });
    return {
      delayOf: (m) => { let p = m; while (p && !layers.includes(p)) p = p.parent; return p ? layers.indexOf(p) * 0.25 + (m.isSprite ? 0.6 : 0) : 0; },
      cam(t, dt) {
        const target = auto ? 4 - ((Math.max(0, t - 1.2) * 1.2) % (total + 6)) : 4 - set * GAP;
        z += (target - z) * Math.min(1, (dt || 0.016) * (auto ? 6 : 2.5));
        ctl.setPower && auto && ctl.setPower(Math.max(0, Math.min(STEPS.length - 1, (4 - z) / GAP)));
        return { pos: V(T, 0, 0.1, z), look: V(T, 0, 0, z - 6) };
      },
    };
  },
  // P17: the slide's own pencil masses as cutouts in a paper diorama; red pencil Fg arrows grow as
  // the masses come closer (inverse square); drag a mass to change d.
  gravityPair(T, g, o) {
    const ink = o.dark ? KIT.darkInk : KIT.graphite;
    // Leo's clean mass cutouts (the slide's left pair, with the baked arrows removed)
    const mass = (src) => { const sp = new T.Sprite(new T.SpriteMaterial({ map: new T.TextureLoader().load(o.kit + src, (tx) => { tx.colorSpace = T.SRGBColorSpace; tx.anisotropy = 8; tx.needsUpdate = true; }), transparent: true, depthWrite: false })); sp.scale.set(1.15 * 104 / 102, 1.15, 1); return sp; };
    const m1 = mass("p17-mass1.webp"), m2 = mass("p17-mass2.webp");
    g.add(m1, m2);
    // a pencil arrow: the shaft stretches with the force, the hand-drawn heads keep their shape
    const arrow = (color, both) => {
      const G = new T.Group(), H = 0.3, lw = (c, ch) => ch * 0.16;
      const shaft = sheet(T, 1, H, 200, (c, w, h) => pencil(c, seg([0, h / 2], [w, h / 2], 6), color, lw(c, h))); G.add(shaft);
      const head = () => sheet(T, H, H, 200, (c, w, h) => pencil(c, [[lw(c, h), h * 0.15], [w - lw(c, h), h / 2], [lw(c, h), h * 0.85]], color, lw(c, h)));
      const h1 = head(); G.add(h1); let h2 = null; if (both) { h2 = head(); h2.rotation.z = Math.PI; G.add(h2); }
      G.userData.set = (len) => { shaft.scale.x = Math.max(0.01, len - H * 0.6); shaft.position.x = 0; h1.position.x = len / 2 - H / 2; if (h2) h2.position.x = -len / 2 + H / 2; };
      return G;
    };
    const a1 = arrow(KIT.red), a2 = arrow(KIT.red); a2.rotation.z = Math.PI; g.add(a1, a2);
    const dl = arrow(ink, true); g.add(dl);
    o.touch.add(m1, { r: 0.6 }); o.touch.add(m2, { r: 0.6 });
    const inkCss = o.dark ? KIT.darkInk : KIT.label;
    // sub/superscripts are drawn as real raised or lowered small digits (the pencil font's ² and ₁ glyphs read badly).
    // Labels carrying a subscript are sized up so their main letter matches the plain "d".
    const P = PHONE ? 1.6 : 1;
    const eq = tag(T, "F_{g} = G m_{1}m_{2} / d^{2}", { h: 0.62 * P, color: inkCss }); eq.position.set(PHONE ? -0.4 : 0, PHONE ? 2.35 : 1.6, 0); g.add(eq);
    const tm1 = tag(T, "m_{1}", { h: 0.5 * P, color: inkCss }), tm2 = tag(T, "m_{2}", { h: 0.5 * P, color: inkCss }), td = tag(T, "d", { h: 0.42 * P, color: inkCss });
    const tf1 = tag(T, "F_{g}", { h: 0.55 * P, color: KIT.red }), tf2 = tag(T, "F_{g}", { h: 0.55 * P, color: KIT.red }); g.add(tm1, tm2, td, tf1, tf2);
    const law = tag(T, "inverse-square law", { h: PHONE ? 0.5 : 0.36, color: o.dark ? KIT.darkInk : PHONE ? inkCss : KIT.label2 }); law.position.set(0, PHONE ? -1.95 : -1.65, 0); g.add(law);
    let d = 2, dragD = null, cam0 = null; const ray = new T.Raycaster();
    return {
      delayOf: (m) => m === m1 || m === m2 ? 0.2 : m.isSprite && m.material.depthTest === false ? 1.2 : 0.8,
      // a gentle sway in front of the diorama, never edge-on to the flat drawings
      cam(t) { const a = o.still ? 0 : Math.sin(t * 0.25) * 0.35; const C = o.camera, tn = Math.tan((C && C.fov || 30) * Math.PI / 360), asp = (C && C.aspect) || 1.8; const R = Math.max(o.phone ? 12 : 8, 4.7 / (tn * asp) + 0.6, 2.4 / tn); return { pos: V(T, Math.sin(a) * R, 0.5, Math.cos(a) * R), look: V(T, 0, 0.1, 0) }; },
      update(t, dt, cam) {
        cam0 = cam; if (dragD == null && !o.still) d = 2.2 + Math.sin(t * 0.35) * 0.9;
        m1.position.set(-d, 0, 0); m2.position.set(d, 0, 0);
        const len = Math.max(0.3, Math.min(2.6, 1.6 * (1.3 * 1.3) / (d * d) * 1.4));
        a1.userData.set(len); a1.position.set(-d + 0.45 + len / 2, 0, 0.02); a2.userData.set(len); a2.position.set(d - 0.45 - len / 2, 0, 0.02);
        dl.userData.set(2 * d); dl.position.set(0, -0.85, 0);
        tm1.position.set(-d, PHONE ? 1.05 : 0.9, 0.05); tm2.position.set(d, PHONE ? 1.05 : 0.9, 0.05); td.position.set(0, -1.15, 0.05);
        tf1.position.set(-d + 0.45 + len + (PHONE ? 0.5 : 0.36), 0.12, 0.05); tf2.position.set(d - 0.45 - len - (PHONE ? 0.5 : 0.36), 0.12, 0.05);
      },
      pointer(e, r, ph, cam) {
        if (ph === "down") { ray.setFromCamera(new T.Vector2(((e.clientX - r.left) / r.width) * 2 - 1, -((e.clientY - r.top) / r.height) * 2 + 1), cam || cam0); if (!ray.intersectObjects([m1, m2]).length) return false; dragD = { x: e.clientX, d0: d }; return true; }
        if (ph === "move" && dragD) d = Math.max(1.1, Math.min(3.4, dragD.d0 + Math.abs(e.clientX - dragD.x) / r.width * 4 * Math.sign(e.clientX - dragD.x)));
        if (ph === "up") dragD = null;
      },
    };
  },
};
export const SCENES = Object.keys(BUILDERS);

// ---- Per-page scene modules: js/astro-scenes/<deck>/pNN.js (see docs/astro-scenes.md) ----
export const LAYER_Z = { fg: 2.2, mid: 0, bg: -6 };
export function palette(dark) {
  return dark ? { dark: true, paper: 0x1e2433, ink: 0xf3ead7, gold: 0xe2b654, blue: 0x7fa6d9, red: 0xd9826b, inkCss: "#F3EAD7", goldCss: "#E2B654", blueCss: "#7FA6D9" }
    : { dark: false, paper: 0xf6efdf, ink: 0x3d3d3d, gold: 0xc9862a, blue: 0x3f6fa8, red: 0xb5523b, inkCss: "#3d3d3d", goldCss: "#8a5a12", blueCss: "#3f6fa8" };
}
// Dark mode: the slide's graphite and black ink turn into light pencil so line art reads on dark paper;
// colored pencil (and white paper fills such as Moon disks) keep their colors.
function inkTexture(T, url) {
  const c = document.createElement("canvas"), tex = new T.CanvasTexture(c);
  img(url).then((im) => {
    if (!im) return; c.width = im.width; c.height = im.height; const g = c.getContext("2d"); g.drawImage(im, 0, 0);
    const d = g.getImageData(0, 0, c.width, c.height), a = d.data;
    for (let i = 0; i < a.length; i += 4) {
      const mx = Math.max(a[i], a[i + 1], a[i + 2]), mn = Math.min(a[i], a[i + 1], a[i + 2]);
      if (a[i + 3] && mx - mn < 46 && mx < 175) { const v = 1 - mx / 175; a[i] = 243 - 60 * (1 - v); a[i + 1] = 234 - 60 * (1 - v); a[i + 2] = 215 - 60 * (1 - v); }
    }
    // the canvas changed size since the first upload, so the GPU texture is rebuilt rather than patched
    g.putImageData(d, 0, 0); tex.dispose(); tex.needsUpdate = true;
  });
  return tex;
}
// Builds the ctx a module sees, runs its build(), and returns the engine-side api.
export function runModule(mod, T, scene, o) {
  const root = new T.Group(); scene.add(root); lights(T, root);
  const layers = {}; for (const [k, z] of Object.entries(LAYER_Z)) { const g = new T.Group(); g.position.z = z; g.name = k; root.add(g); layers[k] = g; }
  const sketches = [], drags = [], loaders = [], th = touchHints(T, { still: o.still });
  let camSet = null; const ptrs = [], ray = new T.Raycaster(), hit = new T.Vector3(), plane = new T.Plane(new T.Vector3(0, 0, 1), 0);
  const ctx = {
    THREE: T, scene: root, camera: o.camera, layers, palette: palette(o.dark), reducedMotion: !!o.still, phone: !!o.phone, controls: o.controls || null,
    sketch(obj, { delay = 0 } = {}) { sketches.push(sketcher(obj, () => delay)); return obj; },
    label(text, pos = [0, 0, 0], { layer = "fg", color, h = 0.4 } = {}) { const s = tag(T, text, { color, raw: true, h: o.phone ? Math.min(h * 1.45, Math.max(h, 1.1)) : h }); s.position.set(...pos); layers[layer].add(s); return s; },
    art(src, { layer = "mid", z = 0, box = [0, 0, 100, 100], opacity = 1, ink = true } = {}) {
      const p = o.place(box, LAYER_Z[layer] + z), tex = o.dark && ink ? inkTexture(T, o.base + src) : new T.TextureLoader().load(o.base + src); tex.colorSpace = T.SRGBColorSpace; loaders.push(tex);
      const m = new T.Mesh(new T.PlaneGeometry(p.w, p.h), new T.MeshBasicMaterial({ map: tex, transparent: true, depthWrite: false, opacity }));
      m.position.set(p.cx, p.cy, z); layers[layer].add(m); return m;
    },
    pencil(base, accent) { return pencilTexture(T, base, accent, o.phone); },
    setCamera(pos, look) { camSet = { pos: new T.Vector3(...pos), look: new T.Vector3(...look) }; },
    onDrag(fn) { drags.push(fn); },
    touchable(obj, opts = {}) { return th.add(obj, opts); },
    // page px (1600 x 900, the slide's own coordinates) to local x, y on a layer, so art and geometry line up at rest
    at(px, py, layer = "mid") { const k = (o.DIST - LAYER_Z[layer]) / o.DIST; return [(px / 1600 * o.W - o.W / 2) * k, (o.H / 2 - py / 900 * o.H) * k]; },
    onPointer(fn) { ptrs.push(fn); },
    // A live pencil drawing on a plane: box is [x0, y0, x1, y1] in page px. redraw(fn) clears it and calls
    // fn(g) with a 2D context already set up in page px, so strokes land exactly on the slide's coordinates.
    paint(box, { layer = "mid", z = 0, density = o.phone ? 1 : 1.5 } = {}) {
      const [x0, y0, x1, y1] = box, c = document.createElement("canvas"); c.width = Math.ceil((x1 - x0) * density); c.height = Math.ceil((y1 - y0) * density);
      const tex = new T.CanvasTexture(c); tex.colorSpace = T.SRGBColorSpace; tex.anisotropy = 8; loaders.push(tex);
      const p = o.place([x0 / 16, y0 / 9, (x1 - x0) / 16, (y1 - y0) / 9], LAYER_Z[layer] + z);
      const mesh = new T.Mesh(new T.PlaneGeometry(p.w, p.h), new T.MeshBasicMaterial({ map: tex, transparent: true, depthWrite: false }));
      mesh.position.set(p.cx, p.cy, z); layers[layer].add(mesh);
      const g = c.getContext("2d");
      return { mesh, redraw(fn) { g.setTransform(1, 0, 0, 1, 0, 0); g.clearRect(0, 0, c.width, c.height); g.setTransform(density, 0, 0, density, -x0 * density, -y0 * density); g.lineCap = "round"; g.lineJoin = "round"; fn(g); tex.needsUpdate = true; } };
    },
    text: o.sceneText || {},
    ui: o.ui || null,
  };
  const user = mod.default(ctx) || {};
  return {
    cam: () => camSet || { pos: new T.Vector3(0, 0, o.DIST), look: new T.Vector3(0, 0, 0) },
    update(t, dt) { for (const s of sketches) s(o.still ? 99 : t); user.update && user.update(t, dt); th.update(t, dt); },
    drag(d) { th.interact(); for (const f of drags) f(d); },
    // onPointer handlers get page px on the mid plane; a handler returning true on "down" takes the drag (no look-around)
    pointer(e, r, ph, cam) {
      if (!ptrs.length || !cam) return false;
      ray.setFromCamera(new T.Vector2(((e.clientX - r.left) / r.width) * 2 - 1, -((e.clientY - r.top) / r.height) * 2 + 1), cam);
      const ndc = [((e.clientX - r.left) / r.width) * 2 - 1, -((e.clientY - r.top) / r.height) * 2 + 1];
      if (!ray.ray.intersectPlane(plane, hit)) hit.set(NaN, NaN, 0);
      const ev = { phase: ph, x: (hit.x + o.W / 2) / o.W * 1600, y: (o.H / 2 - hit.y) / o.H * 900, ndc };
      let took = false; for (const f of ptrs) took = f(ev) === true || took;
      if (ph === "down" && took) th.interact();
      return took;
    },
    interact() { th.interact(); },
    dispose() {
      try { user.dispose && user.dispose(); } finally {
        root.traverse((m) => { if (m.geometry) m.geometry.dispose(); if (m.material) { (m.material.map && m.material.map.dispose()); m.material.dispose(); } });
        for (const t of loaders) t.dispose(); scene.remove(root);
      }
    },
  };
}
