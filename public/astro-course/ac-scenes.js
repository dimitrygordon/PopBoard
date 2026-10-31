// Inside-the-slide 3D scenes (storybook v2, immersive pages). Real geometry for diagrams:
// orbits are rings, planets spheres, forces 3D shafts, labels camera-facing billboards in space.
// Everything sketches in: pencil lines draw on, meshes go wireframe -> hatched, labels write on.
import { pencilTexture } from "./ac-pop3d.js";

const GOLD = 0xe2b654, BLUE = 0x7fa6d9, CREAM = 0xf3ead7, INK = 0x3d3d3d;

// A billboard label: canvas text on a sprite anchored at its left edge so it can write on left to right.
export function label(T, text, o = {}) {
  const dark = document.documentElement.dataset.theme === "dark";
  const px = 72, c = document.createElement("canvas"), g = c.getContext("2d");
  const font = `${o.bold ? "700 " : ""}${px}px "Patrick Hand", "Comic Sans MS", sans-serif`;
  g.font = font; const w = Math.ceil(g.measureText(text).width) + 24;
  c.width = w; c.height = Math.round(px * 1.35);
  g.font = font; g.textBaseline = "middle"; g.fillStyle = o.color || (dark ? "#F3EAD7" : "#3d3d3d");
  // a paper-colored halo keeps labels readable over bright objects such as the Sun
  g.lineJoin = "round"; g.lineWidth = 12; g.strokeStyle = dark ? "rgba(30,36,51,0.85)" : "rgba(246,239,223,0.9)"; g.strokeText(text, 12, c.height / 2);
  g.fillText(text, 12, c.height / 2);
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

function ball(T, r, base, accent, phone, basic) {
  const seg = phone ? 18 : 36, map = pencilTexture(T, base, accent, phone);
  return new T.Mesh(new T.SphereGeometry(r, seg, seg / 2), basic ? new T.MeshBasicMaterial({ map }) : new T.MeshLambertMaterial({ map }));
}
function loopLine(T, r, color, n = 128, opacity = 1) {
  const pts = []; for (let i = 0; i <= n; i++) { const a = i / n * Math.PI * 2; pts.push(new T.Vector3(Math.cos(a) * r, 0, Math.sin(a) * r)); }
  return new T.Line(new T.BufferGeometry().setFromPoints(pts), new T.LineBasicMaterial({ color, transparent: true, opacity }));
}
function tube(T, r, w, color) { return new T.Mesh(new T.TorusGeometry(r, w, 6, 160), new T.MeshBasicMaterial({ color, transparent: true })); }
function glow(T, size, rgba = "226,182,84") {
  const c = document.createElement("canvas"); c.width = c.height = 128;
  const g = c.getContext("2d"), r = g.createRadialGradient(64, 64, 8, 64, 64, 64);
  r.addColorStop(0, `rgba(${rgba},0.75)`); r.addColorStop(1, `rgba(${rgba},0)`); g.fillStyle = r; g.fillRect(0, 0, 128, 128);
  const s = new T.Sprite(new T.SpriteMaterial({ map: new T.CanvasTexture(c), transparent: true, depthWrite: false })); s.scale.setScalar(size); return s;
}
function arrow(T, color) {
  const g = new T.Group(), m = new T.MeshLambertMaterial({ color, transparent: true });
  const shaft = new T.Mesh(new T.CylinderGeometry(0.06, 0.06, 1, 12), m); shaft.position.y = 0.5; g.add(shaft);
  const head = new T.Mesh(new T.ConeGeometry(0.16, 0.36, 14), m); g.add(head);
  g.userData.set = (len) => { shaft.scale.y = Math.max(0.01, len); shaft.position.y = len / 2; head.position.y = len + 0.18; };
  return g;
}
function lights(T, g) { g.add(new T.AmbientLight(0xffffff, 1.5)); const d = new T.DirectionalLight(0xfff2d8, 1.3); d.position.set(-4, 6, 8); g.add(d); }

// Sketch-in for every element under root: lines draw on, solids wireframe then hatch, sprites write on.
function sketcher(root, delayOf = () => 0) {
  const els = []; root.traverse((o) => { if (o.isLine || o.isMesh || o.isPoints || o.isSprite) { o.material.transparent = true; els.push({ o, base: o.material.opacity ?? 1, n: o.isLine ? o.geometry.attributes.position.count : 0 }); } });
  return (t) => {
    for (const e of els) {
      const k = Math.max(0, Math.min(1, (t - delayOf(e.o)) / 0.6)), k2 = Math.max(0, Math.min(1, (t - delayOf(e.o) - 0.6) / 0.4));
      if (e.o.isLine) { e.o.geometry.setDrawRange(0, Math.max(2, Math.floor(e.n * k))); e.o.material.opacity = e.base * (k > 0 ? 1 : 0); }
      else if (e.o.isMesh) { e.o.material.wireframe = k < 1; e.o.material.opacity = e.base * (k < 1 ? k : 0.55 + 0.45 * k2); }
      else e.o.material.opacity = e.base * Math.min(k, 1) * (e.o.userData.fade ?? 1);
    }
  };
}

export function build(kind, T, scene, o) {
  const B = BUILDERS[kind]; if (!B) return null; PHONE = !!o.phone;
  const g = new T.Group(); scene.add(g); lights(T, g);
  const api = B(T, g, o) || {};
  const sk = sketcher(g, api.delayOf || (() => 0)), inner = api.update || (() => {});
  api.update = (t, dt, cam) => { sk(o.still ? 99 : t); inner(t, dt, cam); };
  api.dispose = () => g.traverse((m) => { if (m.material && m.material.map) m.material.map.dispose(); });
  return api;
}

const V = (T, x, y, z) => new T.Vector3(x, y, z);
const BUILDERS = {
  // P1: camera rides Earth's orbit facing the Sun; the Moon swings close in front; the light path carries its label.
  sunOrbit(T, g, o) {
    const SUN = V(T, 0, 0, -16), R = 16;
    const sun = ball(T, 2.2, "#f2c45a", "#c9862a", o.phone, true); sun.position.copy(SUN); g.add(sun);
    const halo = glow(T, 9); halo.position.copy(SUN); g.add(halo);
    const orbit = loopLine(T, R, o.dark ? GOLD : 0xc9862a, 256, 0.8); orbit.position.set(SUN.x, -0.9, SUN.z); g.add(orbit);
    const earth = ball(T, 0.45, "#5b88b8", "#3f6b3a", o.phone); g.add(earth);
    const moon = ball(T, 0.16, "#d8d4cc", "#7a7a7a", o.phone); g.add(moon);
    const path = new T.Line(new T.BufferGeometry().setFromPoints([SUN, V(T, 0, 0, 0)]), new T.LineDashedMaterial({ color: GOLD, dashSize: 0.35, gapSize: 0.22, transparent: true })); path.computeLineDistances(); g.add(path);
    // the label lies along the light path, stretched in perspective
    const strip = tag(T, "1 AU ≈ 8.3 light-minutes", { h: 0.5, color: o.dark ? "#E2B654" : "#8a5a12" }); g.add(strip);
    const photons = []; for (let i = 0; i < 5; i++) { const p = glow(T, 0.6); p.userData.fade = 1; g.add(p); photons.push(p); }
    const tags = [["Sun", sun, 3.2], ["Earth", earth, -0.85], ["Moon", moon, 0.32]].map(([t, m, dy]) => { const s = tag(T, t, { h: t === "Sun" ? 1.1 : 0.32 }); g.add(s); return { s, m, dy }; });
    const title = tag(T, "Where are we in the universe?", { h: 0.5 }); g.add(title);
    let a = Math.PI / 2; const C = V(T, 0, 0.35, 0);
    return {
      delayOf: (m) => m === sun || m === halo ? 0 : m === orbit ? 0.2 : m === earth || m === moon ? 0.4 : 0.8,
      cam(t, dt) { a = Math.PI / 2 + Math.min(t, 600) * 0.006; C.set(SUN.x + Math.cos(a) * R, 0.35, SUN.z + Math.sin(a) * R); return { pos: C, look: SUN }; },
      update(t, dt, cam) {
        const f = SUN.clone().sub(C).setY(0).normalize(), r = new T.Vector3(-f.z, 0, f.x);
        // Earth just ahead and below the viewer; the Moon swings past in front of the lens
        earth.position.copy(C).addScaledVector(f, 6).addScaledVector(r, 1.6).setY(-0.7); earth.rotation.y += dt * 0.5;
        const b = t * 0.4 + 2.2; moon.position.copy(earth.position).addScaledVector(r, Math.cos(b) * 1.6).addScaledVector(f, -Math.sin(b) * 1.6).add(V(T, 0, 0.35, 0));
        path.geometry.setFromPoints([SUN, earth.position]); path.computeLineDistances();
        // the label rides the light path, turned to follow it on screen
        strip.position.copy(SUN).lerp(earth.position, 0.45).add(V(T, 0, 0.32, 0));
        if (cam) { const A = SUN.clone().project(cam), Bp = earth.position.clone().project(cam); const ang = Math.atan2((Bp.y - A.y), (Bp.x - A.x) * cam.aspect); strip.material.rotation = Math.abs(ang) > Math.PI / 2 ? ang + Math.PI : ang; }
        strip.material.opacity = Math.min(1, Math.max(0, t - 1.2));
        photons.forEach((p, i) => { const k = ((t / 8.3) + i / 5) % 1; p.position.copy(SUN).lerp(earth.position, k); p.material.opacity = t > 1 ? 0.9 : 0; });
        for (const q of tags) q.s.position.copy(q.m.position).add(V(T, 0, q.dy, 0));
        title.position.copy(C).addScaledVector(f, 9).setY(2.3);
      },
    };
  },
  // P5: Earth at the centre of its cosmic address; the rings surround the viewer and the slider pulls back through each.
  addressRings(T, g, o) {
    const names = ["Earth", "Solar System", "Milky Way", "Local Group", "Laniakea", "Observable Universe"];
    const earth = ball(T, 0.25, "#5b88b8", "#3f6b3a", o.phone); g.add(earth);
    const eTag = tag(T, "Earth", { h: 0.3 }); eTag.position.set(0, 0.48, 0); g.add(eTag);
    const R = [1.7, 3.2, 5.4, 9, 15];
    const rings = R.map((r, i) => { const m = tube(T, r, 0.03 + i * 0.018, i % 2 ? BLUE : GOLD); m.rotation.x = Math.PI / 2; g.add(m); const s = tag(T, names[i + 1], { h: 0.32 + i * 0.12, color: i % 2 ? "#7FA6D9" : "#E2B654" }); s.position.set(-r * 0.55, 0.25 + i * 0.12, -r * 0.83); g.add(s); return m; });
    const ctl = o.controls || {}; let level = 0, shown = 0, touched = false;
    if (ctl.onLevel) ctl.onLevel(names, (v) => { level = v; touched = true; });
    return {
      delayOf: (m) => { const i = rings.indexOf(m); return i >= 0 ? 0.1 + i * 0.15 : 0; },
      cam(t, dt) {
        if (!touched && !o.still) { level = Math.min(5, Math.max(0, (t - 1.5) / 2.2)); ctl.setLevel && ctl.setLevel(level); }
        shown += (level - shown) * Math.min(1, (dt || 0.016) * 2.5);
        return { pos: V(T, 0, 0.45 + shown * 1.9, 1.5 + shown * 3.4), look: V(T, 0, 0, -1.2) };
      },
      update(t, dt) { earth.rotation.y += dt * 0.3; },
    };
  },
  // P8: Powers of Ten as one continuous fly-out; each power is a depth layer the camera passes through.
  powersFly(T, g, o) {
    const INKC = o.dark ? CREAM : INK;
    const STEPS = [["10⁷ m", "Earth"], ["10⁹ m", "Earth and Moon"], ["10¹² m", "Inner Solar System"], ["10¹³ m", "Solar System"], ["10¹⁷ m", "Nearby stars"], ["10²¹ m", "Milky Way"], ["10²³ m", "Local Group"], ["10²⁷ m", "Observable universe"]];
    const GAP = 7, layers = [];
    const pts = (n, f, color, size) => { const p = new Float32Array(n * 3); for (let i = 0; i < n; i++) p.set(f(i), i * 3); const geo = new T.BufferGeometry(); geo.setAttribute("position", new T.BufferAttribute(p, 3)); return new T.Points(geo, new T.PointsMaterial({ color, size, transparent: true })); };
    STEPS.forEach(([pow, name], i) => {
      const L = new T.Group(); L.position.z = -i * GAP; g.add(L); layers.push(L);
      const frame = tube(T, 2.6, 0.02, i % 2 ? BLUE : GOLD); L.add(frame);
      if (i === 0) L.add(ball(T, 0.7, "#5b88b8", "#3f6b3a", o.phone));
      if (i === 1) { L.add(ball(T, 0.3, "#5b88b8", "#3f6b3a", o.phone)); const r = loopLine(T, 1.5, INKC); r.rotation.x = 1.2; L.add(r); const m = ball(T, 0.1, "#d8d4cc", "#7a7a7a", o.phone); m.position.set(1.5, 0, 0); L.add(m); }
      if (i === 2 || i === 3) { L.add(ball(T, 0.25, "#f2c45a", "#c9862a", o.phone, true)); [0.6, 0.9, 1.2, 1.6, ...(i === 3 ? [1.9, 2.1, 2.3, 2.5] : [])].forEach((r) => { const l = loopLine(T, r * (i === 3 ? 0.95 : 1.4), i === 3 ? BLUE : GOLD); l.rotation.x = 1.25; L.add(l); }); }
      if (i === 4) L.add(pts(o.phone ? 60 : 140, () => [(Math.random() - 0.5) * 4, (Math.random() - 0.5) * 3, (Math.random() - 0.5) * 2], INKC, 0.07));
      if (i === 5) L.add(pts(o.phone ? 500 : 1500, (k) => { const arm = k % 2, rr = Math.pow(Math.random(), 0.7) * 2.3, a = rr * 2.2 + arm * Math.PI + (Math.random() - 0.5) * 0.5; return [Math.cos(a) * rr, Math.sin(a) * rr * 0.55, (Math.random() - 0.5) * 0.15]; }, BLUE, 0.04));
      if (i === 6) for (let k = 0; k < 7; k++) { const p = pts(o.phone ? 60 : 160, () => { const rr = Math.random() * 0.35, a = Math.random() * 6.28; return [Math.cos(a) * rr, Math.sin(a) * rr * 0.4, 0]; }, k % 2 ? INKC : BLUE, 0.035); p.position.set((Math.random() - 0.5) * 4, (Math.random() - 0.5) * 2.6, (Math.random() - 0.5)); L.add(p); }
      if (i === 7) L.add(pts(o.phone ? 600 : 2000, () => { const f = Math.floor(Math.random() * 9), a = f / 9 * 6.28, r = Math.random() * 2.4; return [Math.cos(a) * r + (Math.random() - 0.5) * 0.15, Math.sin(a) * r + (Math.random() - 0.5) * 0.15, (Math.random() - 0.5) * 0.6]; }, GOLD, 0.03));
      const t1 = tag(T, pow, { h: 0.55, color: "#E2B654" }); t1.position.set(0, 1.95, 0.1); L.add(t1);
      const t2 = tag(T, name, { h: 0.36 }); t2.position.set(0, -1.95, 0.1); L.add(t2);
    });
    const total = (STEPS.length - 1) * GAP, ctl = o.controls || {};
    let z = 4, auto = true, set = null;
    if (ctl.onPower) ctl.onPower(STEPS.map((s) => s[1]), (v) => { set = v; auto = false; });
    return {
      delayOf: (m) => { let p = m; while (p && !layers.includes(p)) p = p.parent; return p ? layers.indexOf(p) * 0.25 : 0; },
      cam(t, dt) {
        const target = auto ? 4 - ((Math.max(0, t - 1.2) * 1.4) % (total + 6)) : 4 - set * GAP;
        z += (target - z) * Math.min(1, (dt || 0.016) * (auto ? 6 : 2.5));
        ctl.setPower && auto && ctl.setPower(Math.max(0, Math.min(STEPS.length - 1, (4 - z) / GAP)));
        return { pos: V(T, 0, 0.2, z), look: V(T, 0, 0, z - 6) };
      },
      update(t, dt) { layers.forEach((L, i) => { L.rotation.z += dt * 0.03 * (i % 2 ? 1 : -1); }); },
    };
  },
  // P17: two masses at eye level; Fg arrows are 3D shafts scaled to the pull; the camera orbits the pair.
  gravityPair(T, g, o) {
    const m1 = ball(T, 0.55, "#7FA6D9", "#3f6fa8", o.phone), m2 = ball(T, 0.55, "#7FA6D9", "#3f6fa8", o.phone); g.add(m1, m2);
    const a1 = arrow(T, GOLD), a2 = arrow(T, GOLD); a1.rotation.z = -Math.PI / 2; a2.rotation.z = Math.PI / 2; g.add(a1, a2);
    const dl = new T.Line(new T.BufferGeometry().setFromPoints([V(T, -1, -1, 0), V(T, 1, -1, 0)]), new T.LineDashedMaterial({ color: o.dark ? CREAM : INK, dashSize: 0.15, gapSize: 0.1, transparent: true })); g.add(dl);
    const t1 = tag(T, "m₁", { h: 0.42 }), t2 = tag(T, "m₂", { h: 0.42 }), tf1 = tag(T, "Fg", { h: 0.42, color: "#E2B654" }), tf2 = tag(T, "Fg", { h: 0.42, color: "#E2B654" }), td = tag(T, "d", { h: 0.42 });
    const eq = tag(T, "Fg = G m₁ m₂ / d²", { h: 0.5 }); eq.position.set(0, 1.75, 0); g.add(t1, t2, tf1, tf2, td, eq);
    let d = 2, dragD = null, cam0 = null; const ray = new T.Raycaster();
    return {
      delayOf: (m) => m === m1 || m === m2 ? 0 : 0.5,
      cam(t) { const a = 0.25 + Math.min(t, 900) * 0.1; return { pos: V(T, Math.sin(a) * 8, 0.7, Math.cos(a) * 8), look: V(T, 0, 0.1, 0) }; },
      update(t, dt, cam) {
        cam0 = cam; if (dragD == null && !o.still) d = 2.2 + Math.sin(t * 0.35) * 0.9;
        m1.position.set(-d, 0, 0); m2.position.set(d, 0, 0);
        const len = Math.min(3, 1.6 * (1.3 * 1.3) / (d * d) * 1.4);
        a1.userData.set(len); a1.position.set(-d + 0.6, 0, 0); a2.userData.set(len); a2.position.set(d - 0.6, 0, 0);
        dl.geometry.setFromPoints([V(T, -d, -0.9, 0), V(T, d, -0.9, 0)]); dl.computeLineDistances();
        t1.position.set(-d, 0.95, 0); t2.position.set(d, 0.95, 0); tf1.position.set(-d + 0.6 + len / 2, 0.45, 0); tf2.position.set(d - 0.6 - len / 2, 0.45, 0); td.position.set(0, -1.25, 0);
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
// Builds the ctx a module sees, runs its build(), and returns the engine-side api.
export function runModule(mod, T, scene, o) {
  const root = new T.Group(); scene.add(root); lights(T, root);
  const layers = {}; for (const [k, z] of Object.entries(LAYER_Z)) { const g = new T.Group(); g.position.z = z; g.name = k; root.add(g); layers[k] = g; }
  const sketches = [], drags = [], loaders = [];
  let camSet = null;
  const ctx = {
    THREE: T, scene: root, camera: o.camera, layers, palette: palette(o.dark), reducedMotion: !!o.still, phone: !!o.phone, controls: o.controls || null,
    sketch(obj, { delay = 0 } = {}) { sketches.push(sketcher(obj, () => delay)); return obj; },
    label(text, pos = [0, 0, 0], { layer = "fg", color, h = 0.4 } = {}) { const s = tag(T, text, { color, raw: true, h: o.phone ? Math.min(h * 1.45, Math.max(h, 1.1)) : h }); s.position.set(...pos); layers[layer].add(s); return s; },
    art(src, { layer = "mid", z = 0, box = [0, 0, 100, 100], opacity = 1 } = {}) {
      const p = o.place(box, LAYER_Z[layer] + z), tex = new T.TextureLoader().load(o.base + src); tex.colorSpace = T.SRGBColorSpace; loaders.push(tex);
      const m = new T.Mesh(new T.PlaneGeometry(p.w, p.h), new T.MeshBasicMaterial({ map: tex, transparent: true, depthWrite: false, opacity }));
      m.position.set(p.cx, p.cy, z); layers[layer].add(m); return m;
    },
    pencil(base, accent) { return pencilTexture(T, base, accent, o.phone); },
    setCamera(pos, look) { camSet = { pos: new T.Vector3(...pos), look: new T.Vector3(...look) }; },
    onDrag(fn) { drags.push(fn); },
  };
  const user = mod.default(ctx) || {};
  return {
    cam: () => camSet || { pos: new T.Vector3(0, 0, o.DIST), look: new T.Vector3(0, 0, 0) },
    update(t, dt) { for (const s of sketches) s(o.still ? 99 : t); user.update && user.update(t, dt); },
    drag(d) { for (const f of drags) f(d); },
    dispose() {
      try { user.dispose && user.dispose(); } finally {
        root.traverse((m) => { if (m.geometry) m.geometry.dispose(); if (m.material) { (m.material.map && m.material.map.dispose()); m.material.dispose(); } });
        for (const t of loaders) t.dispose(); scene.remove(root);
      }
    },
  };
}
