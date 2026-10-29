// Circuit Builder view: a 2D canvas. Parts are Tesla-cleared sprites whose leads leave at the
// left and right edge centres, so wires snap there. Every label is live text drawn in code.
import { BOARD_W, BOARD_H, PART_U, terminal } from "./cb-model.js";

export const CAPTION_GAP = 12;
export const FIT_PAD = 16;      // px between the circuit and the board edge when fitting (phones)
export const FIT_MAX = 2;       // never zoom past twice the whole-board scale
export const LABEL_BOX = 14;    // label box height, px
const LABEL_H = CAPTION_GAP + LABEL_BOX;
// Axis-aligned box against a segment (pad px of clearance), via Liang-Barsky clipping.
export function boxHitsSeg(r, a, b, pad = 0) {
  const x0 = r.left - pad, x1 = r.right + pad, y0 = r.top - pad, y1 = r.bottom + pad, dx = b.x - a.x, dy = b.y - a.y;
  let t0 = 0, t1 = 1;
  for (const [p, q] of [[-dx, a.x - x0], [dx, x1 - a.x], [-dy, a.y - y0], [dy, y1 - a.y]]) {
    if (p === 0) { if (q < 0) return false; continue; }
    const t = q / p; if (p < 0) { if (t > t1) return false; if (t > t0) t0 = t; } else { if (t < t0) return false; if (t < t1) t1 = t; }
  }
  return true;
}
// The circuit's extent in board units: part art boxes, their leads, and every wire path.
export function circuitExtent(c) {
  if (!c.parts.length) return null;
  let x0 = Infinity, x1 = -Infinity, y0 = Infinity, y1 = -Infinity;
  const add = (x, y) => { x0 = Math.min(x0, x); x1 = Math.max(x1, x); y0 = Math.min(y0, y); y1 = Math.max(y1, y); };
  for (const p of c.parts) { const k = artKey(p); add(p.x - PART_U / 2, p.y - PART_U / 2 + (ART_TOP[k] / 256) * PART_U); add(p.x + PART_U / 2, p.y - PART_U / 2 + (ART_BOTTOM[k] / 256) * PART_U); }
  for (const w of c.wires) for (const q of routeWire(c, w)) add(q.x, q.y);
  return { x0, x1, y0, y1 };
}
export const ART = ["battery", "bulb-off", "bulb-on", "resistor", "switch-open", "switch-closed", "voltmeter", "ammeter", "board-tile"];
// Bottom edge of the inked art in each 256 px sprite (from the alpha channel), so captions sit 12 px under the art itself.
export const ART_BOTTOM = { battery: 166, bulb: 238, resistor: 157, "switch-open": 170, "switch-closed": 165, voltmeter: 228, ammeter: 228 };
export const ART_TOP = { battery: 90, bulb: 18, resistor: 99, "switch-open": 37, "switch-closed": 75, voltmeter: 28, ammeter: 28 };
export const DIAL = { cx: 128, cy: 146, r: 72 };    // meter pivot and needle length in sprite px
export const GLASS = { cx: 128, cy: 72, r: 52 };    // bulb glass centre and radius
export const FULL_SCALE = { voltmeter: 10, ammeter: 1 };
const SPRITE = (p) => (p.kind === "bulb" ? "bulb-off" : p.kind === "switch" ? (p.closed ? "switch-closed" : "switch-open") : p.kind);
const artKey = (p) => (p.kind === "switch" ? SPRITE(p) : p.kind);

export function loadArt(base = "circuit-builder/art/") {
  const imgs = {};
  return Promise.all(ART.map((n) => new Promise((res) => { const i = new Image(); i.onload = i.onerror = () => res(); i.src = base + n + ".webp"; imgs[n] = i; }))).then(() => imgs);
}

// Wires leave each lead sideways by one grid unit, then take whichever right-angled path
// crosses the fewest parts. All in board units.
const hitsRect = (a, b, r) => {
  const x0 = Math.min(a.x, b.x), x1 = Math.max(a.x, b.x), y0 = Math.min(a.y, b.y), y1 = Math.max(a.y, b.y);
  return x1 > r.x0 && x0 < r.x1 && y1 > r.y0 && y0 < r.y1;
};
export function route(a, b, sa = 0, sb = 0, rects = [], vertical = false) {
  if (Math.abs(a.y - b.y) < 1e-6 && (b.x - a.x) * (sa ? 1 : -1) > 0 && (a.x - b.x) * (sb ? 1 : -1) > 0) return [a, b];
  const a1 = { x: a.x + (sa ? 1 : -1), y: a.y }, b1 = { x: b.x + (sb ? 1 : -1), y: b.y }, mx = (a1.x + b1.x) / 2, my = (a1.y + b1.y) / 2;
  const cands = [
    [a, a1, { x: a1.x, y: b1.y }, b1, b],
    [a, a1, { x: b1.x, y: a1.y }, b1, b],
    [a, a1, { x: mx, y: a1.y }, { x: mx, y: b1.y }, b1, b],
    [a, a1, { x: a1.x, y: my }, { x: b1.x, y: my }, b1, b]
  ];
  if (vertical) {
    // Arrive at b from above or below, straight onto its lead ring, never along its stub.
    const lift = b.y + (a.y < b.y ? -1 : 1) * PART_U * 0.75;
    cands.length = 0;
    cands.push([a, a1, { x: a1.x, y: lift }, { x: b.x, y: lift }, b], [a, a1, { x: b.x, y: a1.y }, b], [a, a1, { x: a1.x, y: (a.y + b.y) / 2 }, { x: b.x, y: (a.y + b.y) / 2 }, b]);
  }
  let best = cands[0], bs = Infinity;
  for (const c of cands) {
    let hits = 0; for (let i = 1; i < c.length; i++) for (const r of rects) if (hitsRect(c[i - 1], c[i], r)) hits++;
    const sc = hits * 1000 + pathLength(c) + (c.length - 2) * 0.5; if (sc < bs) { bs = sc; best = c; }
  }
  return best.filter((q, i) => i === 0 || Math.hypot(q.x - best[i - 1].x, q.y - best[i - 1].y) > 1e-6);
}
// Part bodies as obstacles for routing (the art box, short of the leads).
const bodyRect = (p) => { const k = artKey(p); return { x0: p.x - PART_U * 0.36, x1: p.x + PART_U * 0.36, y0: p.y - PART_U / 2 + (ART_TOP[k] / 256) * PART_U, y1: p.y - PART_U / 2 + (ART_BOTTOM[k] / 256) * PART_U }; };
// A wire's path in board units. A voltmeter lead drops straight onto the lead it clips, so the
// wire visibly ends at that part's own terminal and not on a neighbour's wire.
export function routeWire(c, w) {
  let a = w.a, b = w.b; if (c.parts[b >> 1].kind === "voltmeter" && c.parts[a >> 1].kind !== "voltmeter") [a, b] = [b, a];
  const ta = terminal(c.parts[a >> 1], a & 1), tb = terminal(c.parts[b >> 1], b & 1), rects = c.parts.map(bodyRect);
  const vertical = c.parts[a >> 1].kind === "voltmeter" && c.parts[b >> 1].kind !== "voltmeter";
  return route(ta, tb, a & 1, b & 1, rects, vertical);
}
export const pathLength = (pts) => pts.slice(1).reduce((s, p, i) => s + Math.hypot(p.x - pts[i].x, p.y - pts[i].y), 0);
export function pointAt(pts, d) {
  for (let i = 1; i < pts.length; i++) {
    const a = pts[i - 1], b = pts[i], L = Math.hypot(b.x - a.x, b.y - a.y);
    if (d <= L || i === pts.length - 1) { const k = L ? Math.min(1, d / L) : 0; return { x: a.x + (b.x - a.x) * k, y: a.y + (b.y - a.y) * k }; }
    d -= L;
  }
  return pts[0];
}
export const fmtA = (I) => `${Math.abs(I) < 0.0005 ? "0.00" : Math.abs(I).toFixed(2)} A`;
export const fmtV = (V) => `${Math.abs(V) < 0.005 ? "0.00" : Math.abs(V).toFixed(2)} V`;
export function partLabel(p) {
  switch (p.kind) {
    case "battery": return `${p.v.toFixed(1)} V`;
    case "resistor": return `${p.v} \u03a9`;
    case "bulb": return "Bulb";
    case "switch": return p.closed ? "Switch: on" : "Switch: off";
    case "ammeter": return "Ammeter";
    case "voltmeter": return "Voltmeter";
  }
  return "";
}

export function createScene(canvas, imgs) {
  const ctx = canvas.getContext("2d");
  let dpr = 1, pal = {}, tile = null;
  const view = { x: 0, y: 0, w: 240, h: 160, ox: 0, oy: 0, u: 10 };
  function resize() {
    dpr = Math.min(2, devicePixelRatio || 1);
    canvas.width = Math.round(canvas.clientWidth * dpr); canvas.height = Math.round(canvas.clientHeight * dpr);
    makeTile();
  }
  function makeTile() {
    // The 512 px tile has a line every 32 px: one tile covers 16 grid units.
    const n = Math.max(16, Math.round(view.u * 16 * dpr)), c = document.createElement("canvas"); c.width = c.height = n;
    if (imgs["board-tile"]?.naturalWidth) c.getContext("2d").drawImage(imgs["board-tile"], 0, 0, n, n);
    tile = ctx.createPattern(c, "repeat"); tile?.setTransform?.(new DOMMatrix().translate(view.ox, view.oy).scale(1 / dpr));
  }
  // setBox(b, capH, fit): with fit (the circuit's extent in board units, from circuitExtent), the
  // board fills the whole box and the circuit is scaled to fit it with FIT_PAD px all round.
  function setBox(b, capH, fit = null) {
    const bh = b.h - CAPTION_GAP - capH, u0 = Math.max(6, Math.min(b.w / BOARD_W, bh / BOARD_H));
    if (fit) {
      const fw = Math.max(fit.x1 - fit.x0, 1), fh = Math.max(fit.y1 - fit.y0, 1);
      const u = Math.max(u0, Math.min((b.w - 2 * FIT_PAD) / fw, (bh - 2 * FIT_PAD - LABEL_H) / fh, u0 * FIT_MAX));
      const ox = b.x + b.w / 2 - ((fit.x0 + fit.x1) / 2) * u, oy = b.y + FIT_PAD + (bh - 2 * FIT_PAD - LABEL_H - fh * u) / 2 - fit.y0 * u;
      Object.assign(view, { x: Math.round(b.x), y: Math.round(b.y), w: Math.round(b.w), h: Math.round(bh), ox, oy, u });
    } else {
      const w = u0 * BOARD_W, h = u0 * BOARD_H, x = Math.round(b.x + (b.w - w) / 2), y = Math.round(b.y + Math.max(0, (bh - h) / 2));
      Object.assign(view, { x, y, w: Math.round(w), h: Math.round(h), ox: x, oy: y, u: u0 });
    }
    makeTile(); return view;
  }
  const toScreen = (X, Y) => ({ x: view.ox + X * view.u, y: view.oy + Y * view.u });
  const toBoard = (x, y) => ({ X: (x - view.ox) / view.u, Y: (y - view.oy) / view.u });
  const onBoard = (x, y) => x >= view.x && x <= view.x + view.w && y >= view.y && y <= view.y + view.h;
  const S = () => PART_U * view.u;
  // Art geometry for one part, in screen px.
  function geo(p) {
    const c = toScreen(p.x, p.y), s = S(), k = artKey(p);
    return { c, s, left: c.x - s / 2, top: c.y - s / 2 + (ART_TOP[k] / 256) * s, bottom: c.y - s / 2 + (ART_BOTTOM[k] / 256) * s, right: c.x + s / 2 };
  }
  const labelFont = () => `700 ${view.u * PART_U < 70 ? 11 : 13}px system-ui, sans-serif`;
  // A label sits CAPTION_GAP under its art. If that box would touch a wire or a lead, it moves to
  // the first free side: above the art, then right, then left.
  function labelGeo(p, c = null) {
    const g = geo(p), text = partLabel(p); ctx.font = labelFont();
    const w = ctx.measureText(text).width, h = LABEL_BOX;
    const at = (x, y, side) => ({ x, y, text, side, box: { left: x - w / 2, right: x + w / 2, top: y, bottom: y + h } });
    const below = at(g.c.x, g.bottom + CAPTION_GAP, "below");
    if (!c) return below;
    const segs = wireSegs(c), cands = [below, at(g.c.x, g.top - CAPTION_GAP - h, "above"), at(g.right + 4 + w / 2, g.c.y - h / 2 - g.s * 0.42, "right"), at(g.left - 4 - w / 2, g.c.y - h / 2 - g.s * 0.42, "left")];
    return cands.find((l) => !segs.some(([a, b]) => boxHitsSeg(l.box, a, b, 3))) || below;
  }
  // Every wire segment and every lead stub, in screen px.
  function wireSegs(c) {
    const out = [];
    for (const w of c.wires) { const pts = wirePts(c, w); for (let i = 1; i < pts.length; i++) out.push([pts[i - 1], pts[i]]); }
    c.parts.forEach((p) => { const g = geo(p); out.push([{ x: g.left, y: g.c.y }, { x: g.left + g.s * 0.14, y: g.c.y }], [{ x: g.right - g.s * 0.14, y: g.c.y }, { x: g.right, y: g.c.y }]); });
    return out;
  }
  const sprite = (name, x, y, s, a = 1) => { const im = imgs[name]; if (!im?.naturalWidth) return; ctx.globalAlpha = a; ctx.drawImage(im, x - s / 2, y - s / 2, s, s); ctx.globalAlpha = 1; };
  const wirePts = (c, w) => routeWire(c, w).map((q) => toScreen(q.x, q.y));
  const dragPts = (c, from, b) => { const ta = terminal(c.parts[from >> 1], from & 1), q = toBoard(b.x, b.y); return [ta, { x: ta.x + (from & 1 ? 1 : -1), y: ta.y }, { x: ta.x + (from & 1 ? 1 : -1), y: q.Y }, q].map((p) => toScreen(p.x ?? p.X, p.y ?? p.Y)); };
  const xy = (t) => [t.x, t.y];
  function polyline(pts) { ctx.beginPath(); ctx.moveTo(pts[0].x, pts[0].y); for (const q of pts.slice(1)) ctx.lineTo(q.x, q.y); }

  function bulbGlow(x, y, s, g) {
    if (g < 0.02) return;
    // On the light board a pale glow alone vanishes, so it gets a warm-gray rim and short ink rays.
    const gx = x + ((GLASS.cx - 128) / 256) * s, gy = y + ((GLASS.cy - 128) / 256) * s, r0 = (GLASS.r / 256) * s;
    const R = r0 * (1.5 + 0.9 * g), grad = ctx.createRadialGradient(gx, gy, r0 * 0.6, gx, gy, R);
    grad.addColorStop(0, `rgba(255, 246, 220, ${0.95 * g})`); grad.addColorStop(0.55, `rgba(246, 226, 186, ${0.7 * g})`); grad.addColorStop(0.85, `rgba(150, 122, 84, ${0.28 * g})`); grad.addColorStop(1, "rgba(150, 122, 84, 0)");
    ctx.fillStyle = grad; ctx.beginPath(); ctx.arc(gx, gy, R, 0, Math.PI * 2); ctx.fill();
    ctx.strokeStyle = `rgba(70, 60, 48, ${Math.min(1, g) * 0.7})`; ctx.lineWidth = Math.max(1.5, s * 0.012); ctx.lineCap = "round";
    for (let k = 0; k < 8; k++) {
      const a = -Math.PI / 2 + (k - 3.5) * (Math.PI / 6.5); if (Math.sin(a) > 0.35) continue;
      const r1 = r0 * 1.22, r2 = r0 * (1.3 + 0.35 * Math.min(1, g));
      ctx.beginPath(); ctx.moveTo(gx + Math.cos(a) * r1, gy + Math.sin(a) * r1); ctx.lineTo(gx + Math.cos(a) * r2, gy + Math.sin(a) * r2); ctx.stroke();
    }
  }
  function meter(p, x, y, s, angle, reading) {
    const px = x + ((DIAL.cx - 128) / 256) * s, py = y + ((DIAL.cy - 128) / 256) * s, L = (DIAL.r / 256) * s;
    ctx.fillStyle = pal.board_ink; ctx.textAlign = "center"; ctx.textBaseline = "middle";
    ctx.font = `800 ${Math.round(s * 0.1)}px system-ui, sans-serif`; ctx.fillText(p.kind === "voltmeter" ? "V" : "A", px - L * 0.78, py - L * 0.16);
    ctx.strokeStyle = pal.needle; ctx.lineWidth = Math.max(1.5, s * 0.014); ctx.lineCap = "round";
    ctx.beginPath(); ctx.moveTo(px, py); ctx.lineTo(px + Math.sin(angle) * L, py - Math.cos(angle) * L); ctx.stroke();
    ctx.fillStyle = pal.board_ink; ctx.beginPath(); ctx.arc(px, py, Math.max(2, s * 0.018), 0, Math.PI * 2); ctx.fill();
    ctx.font = `700 ${Math.round(Math.max(10, s * 0.085))}px system-ui, sans-serif`; ctx.fillText(reading, px, py + s * 0.11);
  }
  function label(p, c) {
    const l = labelGeo(p, c);
    ctx.font = labelFont(); ctx.textAlign = "center"; ctx.textBaseline = "top";
    ctx.lineWidth = 3; ctx.strokeStyle = pal.board; ctx.strokeText(l.text, l.x, l.y); ctx.fillStyle = pal.board_ink; ctx.fillText(l.text, l.x, l.y);
  }
  // st: { c, s (solution), glow[], needle[] (radians), dots[] (phase px per wire), sel, wireDrag {a:{x,y}, b:{x,y}}, hot (terminal index) }
  function draw(st) {
    const { c } = st;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0); ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.fillStyle = pal.board; ctx.beginPath(); ctx.roundRect(view.x, view.y, view.w, view.h, 14); ctx.fill();
    ctx.save(); ctx.clip(); if (tile) { ctx.fillStyle = tile; ctx.globalAlpha = 0.9; ctx.fillRect(view.x, view.y, view.w, view.h); ctx.globalAlpha = 1; } ctx.restore();
    ctx.strokeStyle = pal.frame; ctx.lineWidth = 2; ctx.beginPath(); ctx.roundRect(view.x, view.y, view.w, view.h, 14); ctx.stroke();
    // Wires: ink with a pale core, like the leads in the art.
    const lw = Math.max(3, view.u * 0.2);
    c.wires.forEach((w) => { const pts = wirePts(c, w); polyline(pts); ctx.lineJoin = "round"; ctx.strokeStyle = pal.wire; ctx.lineWidth = lw; ctx.stroke(); polyline(pts); ctx.strokeStyle = pal.board; ctx.lineWidth = lw * 0.35; ctx.stroke(); });
    if (st.wireDrag) { polyline(dragPts(c, st.wireDrag.from, st.wireDrag.b)); ctx.setLineDash([6, 5]); ctx.strokeStyle = pal.accent; ctx.lineWidth = lw * 0.8; ctx.stroke(); ctx.setLineDash([]); }
    // Parts.
    c.parts.forEach((p, i) => {
      const g = geo(p), r = st.s?.parts[i];
      if (p.kind === "bulb") bulbGlow(g.c.x, g.c.y, g.s, st.glow[i] || 0);
      sprite(SPRITE(p), g.c.x, g.c.y, g.s);
      if (p.kind === "bulb") sprite("bulb-on", g.c.x, g.c.y, g.s, Math.min(1, st.glow[i] || 0));
      if (p.kind === "voltmeter" || p.kind === "ammeter") meter(p, g.c.x, g.c.y, g.s, st.needle[i] || -1, p.kind === "voltmeter" ? fmtV(r?.reading || 0) : fmtA(r?.reading || 0));
      if (st.shorted?.includes(i)) { ctx.setLineDash([5, 5]); ctx.strokeStyle = pal.accent; ctx.lineWidth = 2; ctx.beginPath(); ctx.roundRect(g.left + g.s * 0.1, g.top - 6, g.s * 0.8, g.bottom - g.top + 12, 10); ctx.stroke(); ctx.setLineDash([]); }
      if (st.sel === i) { ctx.strokeStyle = pal.accent; ctx.lineWidth = 2.5; ctx.beginPath(); ctx.roundRect(g.left + 4, g.top - 6, g.s - 8, g.bottom - g.top + 12, 10); ctx.stroke(); }
      label(p, c);
    });
    // Current dots along each wire, in the accent colour; their spacing stays fixed, their speed follows the current.
    const gap = Math.max(14, view.u * 1.2), dotR = Math.max(2.5, view.u * 0.16);
    ctx.fillStyle = pal.accent;
    c.wires.forEach((w, k) => {
      const I = st.s?.wires[k]?.I || 0; if (Math.abs(I) < 0.002) return;
      const pts = wirePts(c, w), L = pathLength(pts), ph = ((st.dots[k] || 0) % gap + gap) % gap;
      for (let d = ph; d < L; d += gap) { const q = pointAt(pts, d); ctx.beginPath(); ctx.arc(q.x, q.y, dotR, 0, Math.PI * 2); ctx.fill(); }
    });
    // Leads: small rings so students can see where wires snap; joins get a solid dot.
    const used = new Map(); for (const w of c.wires) for (const t of [w.a, w.b]) used.set(t, (used.get(t) || 0) + 1);
    c.parts.forEach((p, i) => [0, 1].forEach((side) => {
      const t = 2 * i + side, q = toScreen(...xy(terminal(p, side))), hot = st.hot === t, n = used.get(t) || 0;
      ctx.beginPath(); ctx.arc(q.x, q.y, hot ? Math.max(8, view.u * 0.5) : Math.max(4, view.u * 0.24), 0, Math.PI * 2);
      if (n >= 2) { ctx.fillStyle = pal.wire; ctx.fill(); }
      ctx.strokeStyle = hot ? pal.accent : pal.wire; ctx.lineWidth = hot ? 3 : 1.5; ctx.stroke();
    }));
  }
  return { resize, setBox, draw, toScreen, toBoard, onBoard, geo, labelGeo, wireSegs, wirePts, view, setPalette(p) { pal = p; } };
}
