// Shared building blocks for the per-page 3D scene modules (D02 to D07). See docs/astro-scenes.md.
// Every helper takes the page ctx, so modules stay plain build(ctx) functions. Nothing here moves the
// camera directly; kit.cam() calls ctx.setCamera every frame. The engine disposes everything under ctx.scene.
import { pencilTexture } from "../../astro-course/ac-pop3d.js";

// Pencil colors for bodies (base, accent), matching the D01 worked example.
export const BODY = {
  sun: ["#f2c45a", "#c9862a"], earth: ["#5b88b8", "#3f6b3a"], moon: ["#d8d4cc", "#7a7a7a"], mars: ["#c9714f", "#7a3b26"],
  mercury: ["#b8aea0", "#6e665c"], venus: ["#e6c98a", "#a8864a"], jupiter: ["#d9b38c", "#9a6a46"], saturn: ["#e8d29a", "#a88c52"],
  uranus: ["#9fd3d6", "#5f9ea3"], neptune: ["#6f8fd9", "#3c559c"], rock: ["#9a8f80", "#5b5348"], ice: ["#dfe9f2", "#8aa6bf"],
  iron: ["#8a7f78", "#4f4640"], lava: ["#e07a3c", "#9a3c1a"], io: ["#e8d36a", "#b07a2a"], europa: ["#e9dcc6", "#a3825f"],
  titan: ["#d9a55a", "#8f6a2e"], pluto: ["#e0c7a8", "#9a7a5a"], water: ["#7fa6d9", "#3f6fa8"], ground: ["#b59a72", "#6e5a3e"],
};

export function kit(ctx) {
  const { THREE: T, layers, palette: P, reducedMotion: RM, phone } = ctx;
  const SEG = phone ? 14 : 28, V = (x = 0, y = 0, z = 0) => new T.Vector3(x, y, z);
  const hasDom = typeof document !== "undefined";
  let seq = 0; // entry order: background, then the main object, then labels, 0.2 s apart
  const K = { T, P, RM, phone, V, SEG, layers };

  K.sk = (obj, delay) => ctx.sketch(obj, { delay: delay ?? Math.min(2.6, 0.2 * seq++) });
  K.add = (obj, layer = "mid", delay) => { layers[layer].add(obj); return K.sk(obj, delay); };
  K.map = (base, accent) => { if (ctx.pencil) return ctx.pencil(base, accent); return hasDom ? pencilTexture(T, base, accent, phone) : null; };
  K.mat = (body, { basic = false, opacity = 1 } = {}) => {
    const [b, a] = Array.isArray(body) ? body : BODY[body] || [body, body], map = K.map(b, a);
    const M = basic ? T.MeshBasicMaterial : T.MeshLambertMaterial;
    return new M(map ? { map, transparent: opacity < 1, opacity } : { color: new T.Color(b), transparent: opacity < 1, opacity });
  };
  K.flat = (color, opacity = 1, side = T.FrontSide) => new T.MeshLambertMaterial({ color, transparent: true, opacity, side });
  K.line = (pts, color = P.ink, { dash = 0, opacity = 1 } = {}) => {
    const g = new T.BufferGeometry().setFromPoints(pts);
    const m = dash ? new T.LineDashedMaterial({ color, dashSize: dash, gapSize: dash * 0.6, transparent: true, opacity }) : new T.LineBasicMaterial({ color, transparent: true, opacity });
    const l = new T.Line(g, m); if (dash) l.computeLineDistances(); return l;
  };
  K.setLine = (l, pts) => { l.geometry.setFromPoints(pts); if (l.material.isLineDashedMaterial) l.computeLineDistances(); };

  // ---- bodies ----
  K.ball = (r, body = "earth", { basic = false, layer = "mid", pos, delay, seg } = {}) => {
    const s = seg || SEG, m = new T.Mesh(new T.SphereGeometry(r, s, Math.max(8, s >> 1)), K.mat(body, { basic: basic || body === "sun" }));
    if (pos) m.position.set(...pos); return K.add(m, layer, delay);
  };
  K.glow = (size, rgba = "226,182,84") => {
    if (!hasDom) return new T.Group();
    const c = document.createElement("canvas"); c.width = c.height = 64;
    const g = c.getContext("2d"), r = g.createRadialGradient(32, 32, 3, 32, 32, 32);
    r.addColorStop(0, `rgba(${rgba},0.7)`); r.addColorStop(1, `rgba(${rgba},0)`); g.fillStyle = r; g.fillRect(0, 0, 64, 64);
    const s = new T.Sprite(new T.SpriteMaterial({ map: new T.CanvasTexture(c), transparent: true, depthWrite: false })); s.scale.setScalar(size); return s;
  };
  K.sun = (r = 1.2, pos = [0, 0, 0], o = {}) => { const s = K.ball(r, "sun", { pos, ...o }); const g = K.glow(r * 4.5); g.position.set(...pos); layers[o.layer || "mid"].add(g); return s; };
  // tilted Earth: a sphere inside a group whose axis line stays fixed in space (toward Polaris)
  K.tiltedEarth = (r = 0.6, tiltDeg = 23.4, o = {}) => {
    const g = new T.Group(), spin = new T.Group(); g.rotation.z = -tiltDeg * Math.PI / 180; g.add(spin);
    const e = new T.Mesh(new T.SphereGeometry(r, SEG, SEG >> 1), K.mat(o.body || "earth")); spin.add(e);
    g.add(K.line([V(0, -r * 1.7, 0), V(0, r * 1.7, 0)], P.ink));
    if (o.pos) g.position.set(...o.pos); layers[o.layer || "mid"].add(g); K.sk(g, o.delay); g.userData.spin = spin; return g;
  };

  // ---- orbits and paths ----
  K.ringPts = (r, n = 96, y = 0) => { const a = []; for (let i = 0; i <= n; i++) { const t = i / n * Math.PI * 2; a.push(V(Math.cos(t) * r, y, Math.sin(t) * r)); } return a; };
  K.ring = (r, color = P.gold, { tilt = 0, dash = 0, pos, layer = "mid", opacity = 1, delay, n } = {}) => {
    const l = K.line(K.ringPts(r, n || (phone ? 64 : 128)), color, { dash, opacity }); l.rotation.x = tilt; if (pos) l.position.set(...pos); return K.add(l, layer, delay);
  };
  K.hoop = (r, w = 0.03, color = P.gold, { tilt = 0, pos, layer = "mid", delay, opacity = 0.9 } = {}) => {
    const m = new T.Mesh(new T.TorusGeometry(r, w, 5, phone ? 64 : 120), new T.MeshBasicMaterial({ color, transparent: true, opacity }));
    m.rotation.x = Math.PI / 2 + tilt; if (pos) m.position.set(...pos); return K.add(m, layer, delay);
  };
  // Kepler: mean anomaly to eccentric anomaly, then the position with the Sun at the focus (origin), orbit in x-z
  K.kepler = (M, e) => { let E = M; for (let i = 0; i < 8; i++) E -= (E - e * Math.sin(E) - M) / (1 - e * Math.cos(E)); return E; };
  K.orbitPos = (a, e, M, out = V()) => { const E = K.kepler(M, e), b = a * Math.sqrt(1 - e * e); return out.set(a * (Math.cos(E) - e), 0, b * Math.sin(E)); };
  K.ellipse = (a, e, color = P.gold, o = {}) => { const pts = []; const n = phone ? 72 : 160; for (let i = 0; i <= n; i++) pts.push(K.orbitPos(a, e, i / n * Math.PI * 2)); const l = K.line(pts, color, o); if (o.pos) l.position.set(...o.pos); return K.add(l, o.layer || "mid", o.delay); };

  // ---- arrows, axes, charts ----
  // A 3D force or motion arrow: shaft + cone, length set by strength. Labels F_g / F_N ride the tip.
  K.arrow = (color = P.gold, { r = 0.05, layer = "mid", delay } = {}) => {
    const g = new T.Group(), m = new T.MeshLambertMaterial({ color, transparent: true });
    const shaft = new T.Mesh(new T.CylinderGeometry(r, r, 1, 8), m), head = new T.Mesh(new T.ConeGeometry(r * 2.8, r * 7, 10), m); g.add(shaft, head);
    const up = V(0, 1, 0), q = new T.Quaternion();
    g.userData.set = (from, dir, len) => { g.position.copy(from); const d = dir.clone().normalize(); q.setFromUnitVectors(up, d); g.quaternion.copy(q);
      const L = Math.max(0.02, len); shaft.scale.y = L; shaft.position.y = L / 2; head.position.y = L + r * 3.5; g.visible = len > 0.01; };
    g.userData.set(V(), V(1, 0, 0), 1); return K.add(g, layer, delay);
  };
  K.axes = (len = 3, names = ["x", "y", "z"], o = {}) => {
    const g = new T.Group(); const dirs = [V(1, 0, 0), V(0, 1, 0), V(0, 0, 1)];
    dirs.forEach((d, i) => { if (!names[i]) return; const a = K.arrow(P.ink, { r: 0.025, delay: o.delay }); g.add(a); a.userData.set(V(), d, len); K.label(names[i], d.clone().multiplyScalar(len + 0.45).add(V(...(o.pos || [0, 0, 0]))).toArray(), { layer: o.layer || "mid", h: 0.3 }); });
    if (o.pos) g.position.set(...o.pos); layers[o.layer || "mid"].add(g); return g;
  };
  K.bars = (vals, { w = 0.5, gap = 0.25, scale = 1, colors, names, pos = [0, 0, 0], layer = "mid", delay } = {}) => {
    const g = new T.Group(), bars = [];
    vals.forEach((v, i) => { const c = colors ? colors[i % colors.length] : P.blue; const b = new T.Mesh(new T.BoxGeometry(w, 1, w), K.flat(c, 0.95)); b.position.x = i * (w + gap); g.add(b); bars.push(b);
      if (names) K.label(names[i], [pos[0] + i * (w + gap), pos[1] - 0.35, pos[2] + w], { layer, h: 0.26 }); });
    g.userData.set = (vs) => vs.forEach((v, i) => { const h = Math.max(0.02, v * scale); bars[i].scale.y = h; bars[i].position.y = h / 2; });
    g.userData.set(vals); g.position.set(...pos); return K.add(g, layer, delay);
  };
  K.curve = (fn, x0, x1, { n = 60, color = P.gold, pos, layer = "mid", delay } = {}) => { const pts = []; for (let i = 0; i <= n; i++) { const x = x0 + (x1 - x0) * i / n; pts.push(fn(x)); } const l = K.line(pts, color); if (pos) l.position.set(...pos); return K.add(l, layer, delay); };

  // ---- backgrounds ----
  K.stars = (n = 600, R = 38) => {
    const N = phone ? Math.min(220, n >> 1) : n, a = new Float32Array(N * 3);
    for (let i = 0; i < N; i++) { const u = Math.random() * 2 - 1, th = Math.random() * Math.PI * 2, s = Math.sqrt(1 - u * u), r = R * (0.85 + Math.random() * 0.3); a.set([s * Math.cos(th) * r, u * r, s * Math.sin(th) * r + 6], i * 3); }
    const g = new T.BufferGeometry(); g.setAttribute("position", new T.BufferAttribute(a, 3));
    const p = new T.Points(g, new T.PointsMaterial({ color: P.ink, size: phone ? 0.16 : 0.12, transparent: true, opacity: 0.8, fog: false })); return K.add(p, "bg");
  };
  // paper grain for card pages: a few faint specks floating far back
  K.grain = () => { const n = phone ? 80 : 180, a = new Float32Array(n * 3); for (let i = 0; i < n; i++) a.set([(Math.random() - 0.5) * 40, (Math.random() - 0.5) * 24, -Math.random() * 6], i * 3);
    const g = new T.BufferGeometry(); g.setAttribute("position", new T.BufferAttribute(a, 3)); return K.add(new T.Points(g, new T.PointsMaterial({ color: P.gold, size: 0.08, transparent: true, opacity: 0.5 })), "bg"); };
  // the page's hand-drawn cutouts as 2 or 3 depth planes in the background, faint so geometry leads
  K.art = (list = [], opacity = 0.38) => list.slice(0, 3).forEach(([src, box], i) => { const m = ctx.art(src, { layer: i < 2 ? "bg" : "mid", z: i === 0 ? 0 : i === 1 ? 2.6 : -3, box, opacity: opacity - i * 0.08 }); K.sk(m); });

  // ---- labels ----
  K.label = (text, pos, { layer = "fg", h = 0.34, color, delay } = {}) => { const s = ctx.label(text, pos, { layer, h, color }); K.sk(s, delay); return s; };
  K.title = (text, pos = [0, 2.6, 0]) => K.label(text, pos, { h: 0.5 });
  K.notToScale = (pos = [3.6, -2.4, 0]) => K.label("not to scale", pos, { h: 0.26, color: P.blueCss });

  // ---- paper cards (Today I Can, checks, exit tickets, standards) ----
  K.card = (w = 2.4, h = 1.4, { color = P.paper, edge = P.gold, pos = [0, 0, 0], layer = "mid", delay } = {}) => {
    const g = new T.Group(), board = new T.Mesh(new T.BoxGeometry(w, h, 0.04), K.flat(color, 0.95)); g.add(board);
    const e = K.line([V(-w / 2, -h / 2, 0.03), V(w / 2, -h / 2, 0.03), V(w / 2, h / 2, 0.03), V(-w / 2, h / 2, 0.03), V(-w / 2, -h / 2, 0.03)], edge); g.add(e);
    g.position.set(...pos); return K.add(g, layer, delay);
  };
  K.check = (pos, s = 0.3, layer = "mid") => K.add(K.line([V(-s, 0, 0), V(-s * 0.3, -s * 0.7, 0), V(s, s * 0.8, 0)].map((p) => p.add(V(...pos))), P.gold), layer);
  // a pencil: hexagon body, wood cone, graphite tip
  K.pencilProp = () => { const g = new T.Group(); const b = new T.Mesh(new T.CylinderGeometry(0.08, 0.08, 1.4, 6), K.flat(P.gold)); b.position.y = 0.7; const c = new T.Mesh(new T.ConeGeometry(0.08, 0.26, 6), K.flat(0xd9b38c)); c.rotation.x = Math.PI; c.position.y = -0.13; g.add(b, c); return g; };


  // ---- labels that follow objects: kept in the fg layer (z offset 2.2) ----
  K.tag = (text, o = {}) => K.label(text, [0, 0, 0], o);
  K.at = (sprite, w, dx = 0, dy = 0) => { const z = sprite.parent === layers.fg ? 2.2 : sprite.parent === layers.bg ? -6 : 0; sprite.position.set(w.x + dx, w.y + dy, w.z - z); };

  // ---- sky helpers ----
  // A frame whose local +y points at the celestial pole for latitude lat (north is -z, up is +y).
  // Returns the inner spinning group; put sky objects in it (local +y is the pole).
  K.poleFrame = (lat = 38.7, layer = "mid") => { const g = new T.Group(), spin = new T.Group(); g.rotation.x = -(90 - lat) * Math.PI / 180; g.add(spin); layers[layer].add(g); return spin; };
  // the sky turns counterclockwise around Polaris as seen facing north: negative angle about the pole axis
  K.turnSky = (spin, a) => { spin.rotation.y = -a; };
  K.dome = (R = 12, { color = P.blue, lines = 6 } = {}) => {
    const g = new T.Group();
    for (const alt of [0, 30, 60]) { const r = R * Math.cos(alt * Math.PI / 180), l = K.line(K.ringPts(r, phone ? 48 : 96, R * Math.sin(alt * Math.PI / 180)), color, { opacity: alt ? 0.45 : 0.9 }); g.add(l); }
    for (let i = 0; i < lines; i++) { const az = i / lines * Math.PI, pts = []; for (let k = 0; k <= 32; k++) { const a = k / 32 * Math.PI; pts.push(V(Math.cos(a) * Math.cos(az) * R, Math.sin(a) * R, Math.cos(a) * Math.sin(az) * R)); } g.add(K.line(pts, color, { opacity: 0.35 })); }
    const ground = new T.Mesh(new T.CircleGeometry(R, phone ? 24 : 48), K.flat(P.paper, 0.85)); ground.rotation.x = -Math.PI / 2; ground.position.y = -0.01; g.add(ground);
    return g;
  };
  K.dipper = (s = 1) => { const st = [[0, 0], [1.1, -0.15], [1.9, -0.55], [2.8, -0.75], [3.0, -1.6], [4.2, -1.75], [4.4, -0.85]], g = new T.Group();
    const pts = st.map(([x, y]) => V(x * s, y * s, 0)); g.add(K.line([...pts, pts[3]], P.gold, { dash: 0.12 * s }));
    pts.forEach((p) => { const m = new T.Mesh(new T.OctahedronGeometry(0.09 * s, 0), new T.MeshBasicMaterial({ color: P.ink })); m.position.copy(p); g.add(m); }); return g; };
  // a ball whose lit half always faces the light: dark sphere plus a bright hemisphere turned toward the Sun
  K.litBall = (r, body = "moon", o = {}) => {
    const g = new T.Group(), s = SEG;
    g.add(new T.Mesh(new T.SphereGeometry(r * 0.995, s, s >> 1), new T.MeshBasicMaterial({ color: P.dark ? 0x2c3346 : 0x55504a, transparent: true })));
    g.add(new T.Mesh(new T.SphereGeometry(r, s, s >> 1, 0, Math.PI), K.mat(body, { basic: true })));
    g.userData.face = (sunWorld) => { g.lookAt(sunWorld); };
    if (o.pos) g.position.set(...o.pos); return K.add(g, o.layer || "mid", o.delay);
  };
  K.cone = (r, h, color = P.ink, opacity = 0.25) => { const m = new T.Mesh(new T.ConeGeometry(r, h, phone ? 12 : 24, 1, true), K.flat(color, opacity, T.DoubleSide)); return m; };
  K.block = (w, h, d, body = "ground", pos = [0, 0, 0]) => { const m = new T.Mesh(new T.BoxGeometry(w, h, d), K.mat(body)); m.position.set(...pos); return K.add(m); };
  K.specks = (n, fn, color = P.ink, size = 0.06) => { const N = phone ? Math.ceil(n / 2) : n, a = new Float32Array(N * 3); for (let i = 0; i < N; i++) a.set(fn(i, N), i * 3);
    const g = new T.BufferGeometry(); g.setAttribute("position", new T.BufferAttribute(a, 3)); return new T.Points(g, new T.PointsMaterial({ color, size, transparent: true })); };

  // ---- drag scrub: turns the page's look-drag into a persistent value ----
  K.scrub = (k = 1, v0 = 0, lo = -Infinity, hi = Infinity) => {
    const s = { v: v0, touched: false }; let last = 0;
    ctx.onDrag(({ dx, dy }) => { if (Math.abs(dx) < 0.004 && Math.abs(dy) < 0.004 || Math.abs(dx - last) > 0.25) last = dx; s.v = Math.max(lo, Math.min(hi, s.v + (dx - last) * k)); last = dx; s.touched = true; });
    return s;
  };
  // ---- camera: sits inside the scene with a slow sway; drag-look and dolly come from the engine ----
  K.cam = (pos = [0, 0.5, 7], look = [0, 0, 0], sway = 0.35) => (t) => {
    const k = RM ? 0 : Math.min(t, 900); ctx.setCamera([pos[0] + Math.sin(k * 0.11) * sway, pos[1] + Math.sin(k * 0.07) * sway * 0.4, pos[2]], look);
  };
  K.tick = (t) => (RM ? 0 : t);
  return K;
}

// Gentle 3D for cards pages. kind: "goals" (tabs fold up and tick), "check" (cards stand up, wobble, flip),
// "exit" (prompts fold up, a pencil taps beside each), "standards" (cards sketch in and tilt).
export function cardsPage(ctx, { title, items = [], kind = "check", backs = [], art = [], extra } = {}) {
  const K = kit(ctx), { T, V, P } = K;
  K.grain(); if (kind !== "check" && kind !== "exit") K.art(art, 0.3); // check pages skip the art so answers are not drawn twice
  const n = items.length, cols = kind === "check" && n === 4 ? 2 : 1, rows = Math.ceil(n / cols);
  // layout fits the 11.4 x 6.4 view of the card plane: title on top, cards between y = 1.7 and y = -2.6
  const step = Math.min(1.5, 4.3 / rows), w = cols === 2 ? 4.6 : 7.4, h = step * 0.72, cards = [];
  items.forEach((txt, i) => {
    const c = i % cols, r = Math.floor(i / cols), x = cols === 2 ? (c - 0.5) * (w + 0.4) : 0.4, y = 1.7 - step / 2 - r * step;
    const card = K.card(w, h, { pos: [x, y, 0] }), th = Math.min(0.42, h * 0.42);
    const front = ctx.label(txt, [0, 0, 0.06], { layer: "mid", h: th }); card.add(front); K.sk(front);
    let back = null; if (backs[i]) { back = ctx.label(backs[i], [0, 0, -0.06], { layer: "mid", h: th, color: P.goldCss }); card.add(back); back.visible = false; }
    const tick = kind === "goals" ? K.check([x - w / 2 - 0.45, y, 0.1], 0.22) : null; if (tick) tick.visible = false;
    cards.push({ card, front, back, tick, y, x, flip: 0, target: 0 });
  });
  K.label(title, [0, 2.45, 0], { layer: "mid", h: 0.5 });
  const pencil = kind === "exit" ? K.add(K.pencilProp(), "fg") : null;
  if (pencil) pencil.rotation.z = 0.5;
  if (extra) extra(K);
  let pick = -1;
  ctx.onDrag(({ x, y }) => { // a tap or drag over a card picks it (cards pages have no other touch)
    const best = cards.reduce((b, c, i) => { const sy = 0.5 - c.y / 6.43, sx = 0.5 + c.x / 11.4, d = Math.hypot(x - sx, (y - sy) * 0.8); return d < b.d ? { d, i } : b; }, { d: 1e9, i: -1 });
    if (best.i >= 0 && best.i !== pick) { pick = best.i; cards[pick].target = cards[pick].target ? 0 : Math.PI; }
  });
  const cam = K.cam([0, 0, 12], [0, 0, 0], 0.25); // 6.4 x 11.4 units visible at the card plane
  return {
    update(t, dt) {
      cam(t); const tt = K.tick(t);
      cards.forEach((c, i) => {
        const k = K.RM ? 1 : Math.max(0, Math.min(1, (t - 0.6 - i * 0.35) / 0.6)); // fold up one by one
        c.card.rotation.x = (1 - k) * -1.4 + (K.RM ? 0 : Math.sin(tt * 1.3 + i) * 0.04);
        c.card.rotation.y += ((c.target + (K.RM ? 0 : Math.sin(tt * 0.9 + i * 1.7) * 0.08)) - c.card.rotation.y) * Math.min(1, dt * 5 || 1);
        const backSide = Math.cos(c.card.rotation.y) < 0; c.front.visible = !backSide || !c.back; if (c.back) c.back.visible = backSide;
        if (c.tick) c.tick.visible = k >= 1 && t > 1.2 + i * 0.35;
      });
      if (pencil) { const i = Math.min(cards.length - 1, Math.floor((K.RM ? 0 : t * 0.5) % Math.max(1, cards.length))), c = cards[i]; if (c) pencil.position.set(c.x - w / 2 - 0.6, c.y + 0.2 + Math.abs(Math.sin(K.tick(t) * 4)) * 0.15, 0); }
    },
    dispose() {},
  };
}
