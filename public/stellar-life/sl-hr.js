// Stellar Life Cycle VR: the live H-R panel (LOOK-SPEC v2 section 4). Same axes as the H-R Diagram module:
// temperature increasing to the LEFT on a log scale, luminosity in Suns on a log scale. One 2D canvas renderer,
// used for the page card (desktop and phone) and for the in-headset panel texture.
import { temperatureToSRGB } from "../night-sky/ns-astro.js";

export const VIEWS = {
  // default: 60,000 K to 2,500 K, 10^-3 to 10^6.2 Suns (LOOK-SPEC 4). wide: room for white dwarf cooling.
  normal: { tL: Math.log10(60000), tR: Math.log10(2500), lB: -3, lT: 6.2 },
  wide: { tL: Math.log10(260000), tR: Math.log10(1800), lB: -6, lT: 6.4 },
};
const SUP = { "-": "\u207B", 0: "\u2070", 1: "\u00B9", 2: "\u00B2", 3: "\u00B3", 4: "\u2074", 5: "\u2075", 6: "\u2076", 7: "\u2077", 8: "\u2078", 9: "\u2079" };
const sup = (n) => String(n).split("").map((c) => SUP[c]).join("");
const css = (c, a = 1) => `rgba(${Math.round(c[0] * 255)},${Math.round(c[1] * 255)},${Math.round(c[2] * 255)},${a})`;
const tcol = (logT, a = 1) => css(temperatureToSRGB(Math.pow(10, logT)), a);

export function plotRect(W, H, s) { const padL = (W / s < 300 ? 44 : 70) * s, padR = 22 * s, padT = 60 * s, padB = 64 * s; return { x: padL, y: padT, w: W - padL - padR, h: H - padT - padB }; }
export function toXY(view, rect, logT, logL) { return [rect.x + (view.tL - logT) / (view.tL - view.tR) * rect.w, rect.y + (view.lT - logL) / (view.lT - view.lB) * rect.h]; }
export function fromXY(view, rect, x, y) { return { logT: view.tL - (x - rect.x) / rect.w * (view.tL - view.tR), logL: view.lT - (y - rect.y) / rect.h * (view.lT - view.lB) }; }

function polyline(g, view, rect, pts, { dashed = false, width = 3, color = null, alpha = 1, glow = 0 } = {}) {
  if (pts.length < 2) return;
  g.save(); g.lineCap = "round"; g.lineJoin = "round"; g.lineWidth = width; if (dashed) g.setLineDash([width * 2.2, width * 1.8]);
  if (glow) { g.shadowColor = "rgba(160,180,255,0.35)"; g.shadowBlur = glow; }
  if (color) { g.strokeStyle = color; g.globalAlpha = alpha; g.beginPath(); pts.forEach((p, i) => { const [x, y] = toXY(view, rect, p.logT, p.logL); i ? g.lineTo(x, y) : g.moveTo(x, y); }); g.stroke(); }
  else { for (let i = 1; i < pts.length; i++) { const a = pts[i - 1], b = pts[i]; const [x0, y0] = toXY(view, rect, a.logT, a.logL), [x1, y1] = toXY(view, rect, b.logT, b.logL); g.strokeStyle = tcol((a.logT + b.logT) / 2, alpha); g.beginPath(); g.moveTo(x0, y0); g.lineTo(x1, y1); g.stroke(); } }
  g.restore();
}

/** m: { view, trail: [{pts, dashed}], dot, ghosts: [{label, pts}], pins: [{logT, logL, label, n}], today, noDot, fork, predictedLabel, help, title }
 * s: scale (1 for the page at 1x; about 2.4 for the 1024 headset texture, so text stays at 56 px or more there) */
export function drawHR(g, W, H, m, s = 1) {
  const view = VIEWS[m.view || "normal"]; const rect = plotRect(W, H, s);
  g.clearRect(0, 0, W, H);
  const fs = (px, w = 600) => `${w} ${Math.round(px * s)}px Inter, -apple-system, "SF Pro Text", system-ui, sans-serif`;
  // panel
  g.save(); const r = 22 * s; g.beginPath(); g.roundRect ? g.roundRect(0, 0, W, H, r) : g.rect(0, 0, W, H);
  const grd = g.createLinearGradient(0, 0, 0, H); grd.addColorStop(0, "rgba(24,29,60,0.86)"); grd.addColorStop(1, "rgba(10,13,32,0.90)"); g.fillStyle = grd; g.fill();
  g.strokeStyle = "rgba(255,255,255,0.16)"; g.lineWidth = 1.5 * s; g.stroke(); g.restore();
  g.fillStyle = "#fff"; g.font = fs(15, 650); g.textBaseline = "alphabetic"; g.fillText(m.title || "H-R diagram", 18 * s, 28 * s);
  // grid and axes
  g.save(); g.beginPath(); g.rect(rect.x, rect.y, rect.w, rect.h); g.clip();
  g.strokeStyle = "rgba(255,255,255,0.07)"; g.lineWidth = 1 * s;
  for (let l = Math.ceil(view.lB); l <= view.lT; l++) { const [, y] = toXY(view, rect, 0, l); g.beginPath(); g.moveTo(rect.x, y); g.lineTo(rect.x + rect.w, y); g.stroke(); }
  for (const T of [2000, 3000, 5000, 10000, 20000, 30000, 50000, 100000, 200000]) { const lt = Math.log10(T); if (lt > view.tL || lt < view.tR) continue; const [x] = toXY(view, rect, lt, 0); g.beginPath(); g.moveTo(x, rect.y); g.lineTo(x, rect.y + rect.h); g.stroke(); }
  // ghost trails (earlier runs this session): neutral #D6DEF0 at 0.26
  for (const gh of m.ghosts || []) {
    polyline(g, view, rect, gh.pts, { color: "#D6DEF0", alpha: 0.30, width: 2 * s, dashed: !!gh.dashed });
    if (gh.label && gh.pts.length) { const p = gh.pts[0]; const [x, y] = toXY(view, rect, p.logT, p.logL); g.fillStyle = "rgba(214,222,240,0.75)"; g.font = fs(11, 600); g.fillText(gh.label, x + 6 * s, y - 6 * s); }
  }
  // Tier 1: highlighted zones the pins snap to (generic regions, the same for every mass)
  for (const z of m.zones || []) {
    g.save(); g.fillStyle = "rgba(164,140,255,0.16)"; g.strokeStyle = "rgba(201,189,255,0.75)"; g.lineWidth = 1.5 * s; g.setLineDash([5 * s, 4 * s]); g.beginPath();
    let lab;
    if (z.box) { const [x0, y0] = toXY(view, rect, z.box.t0, z.box.l1), [x1, y1] = toXY(view, rect, z.box.t1, z.box.l0); g.rect(Math.min(x0, x1), Math.min(y0, y1), Math.abs(x1 - x0), Math.abs(y1 - y0)); lab = [Math.min(x0, x1) + 4 * s, Math.min(y0, y1) + 14 * s]; }
    else { const { a, b, half } = z.band; const P = [[a[0], a[1] + half], [b[0], b[1] + half], [b[0], b[1] - half], [a[0], a[1] - half]].map(([t, l]) => toXY(view, rect, t, l)); P.forEach(([x, y], i) => (i ? g.lineTo(x, y) : g.moveTo(x, y))); g.closePath(); const c = toXY(view, rect, (a[0] * 0.45 + b[0] * 0.55), (a[1] * 0.45 + b[1] * 0.55) + half); lab = [c[0] + 8 * s, c[1] - 4 * s]; }
    g.fill(); g.stroke(); g.setLineDash([]); g.fillStyle = "#E3DBFF"; g.font = fs(10.5, 650); g.fillText(z.label, lab[0], lab[1]); g.restore();
  }
  // prediction pins (H-Path)
  for (const p of m.pins || []) {
    const [x, y] = toXY(view, rect, p.logT, p.logL);
    g.save(); g.strokeStyle = "#A48CFF"; g.fillStyle = "rgba(164,140,255,0.25)"; g.lineWidth = 2 * s; g.beginPath(); g.arc(x, y, 9 * s, 0, Math.PI * 2); g.fill(); g.stroke();
    g.fillStyle = "#fff"; g.font = fs(11, 700); g.textAlign = "center"; g.fillText(String(p.n), x, y + 4 * s); g.textAlign = "left";
    g.restore();
  }
  // live trail
  for (const seg of m.trail || []) polyline(g, view, rect, seg.pts, { dashed: !!seg.dashed, width: 4 * s, glow: 8 * s, color: seg.neutral ? "#D6DEF0" : null, alpha: seg.dashed ? 0.9 : 1 });
  if (m.predictedLabel) { const p = m.predictedLabel; const [x, y] = toXY(view, rect, p.logT, p.logL); g.fillStyle = "#E6E9F8"; g.font = fs(12, 650); g.fillText("predicted", x - 30 * s, y - 12 * s); }
  // 40 Suns fork (Tesla ruling): two dashed arms from the MIST end, no direction chosen
  if (m.fork) {
    const [x, y] = toXY(view, rect, m.fork.logT, m.fork.logL); const L = 40 * s;
    g.save(); g.setLineDash([6 * s, 5 * s]); g.lineWidth = 3 * s; g.strokeStyle = "rgba(230,233,248,0.85)";
    g.beginPath(); g.moveTo(x, y); g.lineTo(x - L * 0.8, y - L * 0.42 * 0.8); g.moveTo(x, y); g.lineTo(x + L * 0.8, y - L * 0.42 * 0.8); g.stroke(); g.restore();
    g.fillStyle = "#E6E9F8"; g.font = fs(12, 650); g.fillText("40 Suns: models differ from here", Math.max(rect.x + 4 * s, x - 150 * s), y - 30 * s);
  }
  // S1 today marker
  if (m.today) { const [x, y] = toXY(view, rect, m.today.logT, m.today.logL); g.save(); g.strokeStyle = "#7FB2FF"; g.lineWidth = 2.5 * s; g.beginPath(); g.arc(x, y, 13 * s, 0, Math.PI * 2); g.stroke(); g.fillStyle = "#AACDFF"; g.font = fs(11, 650); g.fillText("Today", x + 16 * s, y - 2 * s); g.font = fs(10.5, 500); g.fillText("4.6 billion years", x + 16 * s, y + 11 * s); g.restore(); }
  // COMPARE: two dots on one panel, each labelled with its mass
  for (const d of m.dots || []) {
    const [x, y] = toXY(view, rect, d.logT, d.logL);
    g.save(); g.shadowColor = tcol(d.logT, 0.9); g.shadowBlur = 18 * s; g.fillStyle = tcol(d.logT); g.beginPath(); g.arc(x, y, 6.5 * s, 0, Math.PI * 2); g.fill(); g.restore();
    g.strokeStyle = "#fff"; g.lineWidth = 2.2 * s; g.beginPath(); g.arc(x, y, 7.5 * s, 0, Math.PI * 2); g.stroke();
    g.fillStyle = "#FFFFFF"; g.font = fs(11.5, 700); g.fillText(d.label, x + 11 * s, y - 9 * s);
  }
  // dot or the remnant's empty ring
  if (m.dot) {
    const [x, y] = toXY(view, rect, m.dot.logT, m.dot.logL);
    g.save(); g.shadowColor = tcol(m.dot.logT, 0.9); g.shadowBlur = 18 * s; g.fillStyle = tcol(m.dot.logT); g.beginPath(); g.arc(x, y, 6.5 * s, 0, Math.PI * 2); g.fill(); g.restore();
    g.strokeStyle = "#fff"; g.lineWidth = 2.2 * s; g.beginPath(); g.arc(x, y, 7.5 * s, 0, Math.PI * 2); g.stroke();
  } else if (m.noDot) {
    const [x, y] = toXY(view, rect, m.noDot.logT, m.noDot.logL); g.save(); g.setLineDash([4 * s, 4 * s]); g.strokeStyle = "rgba(255,255,255,0.7)"; g.lineWidth = 2 * s; g.beginPath(); g.arc(x, y, 9 * s, 0, Math.PI * 2); g.stroke(); g.restore();
    const msg = "Not on this H-R diagram"; g.font = fs(12, 650); const tw = g.measureText(msg).width;
    const bx = rect.x + 10 * s, by = rect.y + rect.h - 40 * s; g.fillStyle = "rgba(8,10,24,0.78)"; g.beginPath(); g.roundRect ? g.roundRect(bx, by, tw + 20 * s, 28 * s, 10 * s) : g.rect(bx, by, tw + 20 * s, 28 * s); g.fill();
    g.strokeStyle = "rgba(255,255,255,0.2)"; g.lineWidth = 1 * s; g.stroke(); g.fillStyle = "#fff"; g.fillText(msg, bx + 10 * s, by + 19 * s);
  }
  g.restore();
  // pin key in the header, outside the plot (so it never covers the Sun dot or clips at the right edge)
  if ((m.pins || []).length) {
    g.save(); let px = 11; const items = m.pins.map((p) => [String(p.n), p.label]); const avail = W - 36 * s;
    const width = (f) => { g.font = fs(f, 600); return items.reduce((a, [, l]) => a + 22 * s + g.measureText(l).width + 12 * s, 0); };
    while (px > 9 && width(px) > avail) px -= 0.5;
    let x = 18 * s; const y = 47 * s; g.textBaseline = "middle";
    for (const [n, l] of items) { g.strokeStyle = "#A48CFF"; g.fillStyle = "rgba(164,140,255,0.25)"; g.lineWidth = 1.5 * s; g.beginPath(); g.arc(x + 8 * s, y, 8 * s, 0, Math.PI * 2); g.fill(); g.stroke();
      g.fillStyle = "#fff"; g.font = fs(10, 700); g.textAlign = "center"; g.fillText(n, x + 8 * s, y + 0.5 * s); g.textAlign = "left";
      g.fillStyle = "#C9BDFF"; g.font = fs(px, 600); g.fillText(l, x + 20 * s, y + 0.5 * s); x += 22 * s + g.measureText(l).width + 12 * s; }
    g.restore(); g.textBaseline = "alphabetic";
  }
  // colour strip under the axis (temperatureToSRGB)
  const sy = rect.y + rect.h + 4 * s; for (let i = 0; i < rect.w; i += 2) { const lt = view.tL - i / rect.w * (view.tL - view.tR); g.fillStyle = tcol(lt); g.fillRect(rect.x + i, sy, 2.2, 7 * s); }
  g.strokeStyle = "rgba(255,255,255,0.35)"; g.lineWidth = 1.5 * s; g.strokeRect(rect.x, rect.y, rect.w, rect.h);
  g.fillStyle = "#C3C9E6"; g.font = fs(11.5, 600);
  const help = m.help || 0;
  if (help >= 1) {
    for (const T of (m.view === "wide" ? [100000, 30000, 10000, 3000] : [30000, 10000, 5000, 3000])) { const lt = Math.log10(T); if (lt > view.tL || lt < view.tR) continue; const [x] = toXY(view, rect, lt, 0); g.textAlign = "center"; g.fillText(T.toLocaleString("en-US") + " K", x, sy + 24 * s); }
    g.textAlign = "right"; for (let l = Math.ceil(view.lB); l <= view.lT; l += (view.lT - view.lB > 9 ? 2 : 2)) { const [, y] = toXY(view, rect, 0, l); g.fillText(l === 0 ? "1" : l > 0 && l < 4 ? String(Math.pow(10, l)) : "10" + sup(l), rect.x - 6 * s, y + 4 * s); }
    g.textAlign = "left";
  } else {
    // level 0: axes in words, spectral letters and a Sun marker
    const letters = rect.w / s > 250 ? [["O", 40000], ["B", 20000], ["A", 8750], ["F", 6750], ["G", 5600], ["K", 4400], ["M", 3000]] : [["O", 40000], ["B", 20000], ["A", 8750], ["G", 5600], ["M", 3000]];
    g.textAlign = "center"; for (const [L, T] of letters) { const lt = Math.log10(T); if (lt > view.tL || lt < view.tR) continue; const [x] = toXY(view, rect, lt, 0); g.fillText(L, x, sy + 24 * s); } g.textAlign = "left";
  }
  g.fillStyle = "#A9B0D0"; g.font = fs(11.5, 650);
  g.fillText("Hotter", rect.x, H - 12 * s); g.textAlign = "right"; g.fillText("Cooler", rect.x + rect.w, H - 12 * s); if (rect.w / s > 250) { g.textAlign = "center"; g.fillText(help >= 1 ? "Surface temperature" : "Temperature", rect.x + rect.w / 2, H - 12 * s); } g.textAlign = "left";
  g.save(); g.translate(18 * s, rect.y + rect.h / 2); g.rotate(-Math.PI / 2); g.textAlign = "center"; g.fillText(help >= 1 ? "Brightness (Sun = 1)" : "Brighter", 0, 0); g.restore();
  // Sun marker (5,772 K, 1 Lsun)
  const [sx, syy] = toXY(view, rect, Math.log10(5772), 0); g.save(); g.strokeStyle = "rgba(255,241,234,0.8)"; g.lineWidth = 1.5 * s; g.beginPath(); g.arc(sx, syy, 4 * s, 0, Math.PI * 2); g.stroke(); g.beginPath(); g.arc(sx, syy, 1.2 * s, 0, Math.PI * 2); g.fillStyle = "#FFF1EA"; g.fill(); g.fillStyle = "rgba(255,241,234,0.85)"; g.font = fs(10.5, 600); g.fillText("Sun", sx + 6 * s, syy + 14 * s); g.restore();
  return rect;
}
