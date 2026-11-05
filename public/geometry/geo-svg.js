// Geometry course: SVG string builders in the line-art style (ink on paper, currentColor so dark mode inverts).
// Weights: 1 construction, 2 main, 3 emphasis. Round caps and joins. Pure strings, so node can build covers too.
const f = (n) => (Math.round(n * 100) / 100).toString();
export const W = { thin: 1, main: 2, bold: 3 };
// weights are in SVG units on a 1600-wide figure; `k` scales them so on-screen weight stays near 1, 2 and 3 px
export function pen(opt = {}, k = 1) {
  const w = (opt.w === "thin" ? W.thin : opt.w === "bold" ? W.bold : typeof opt.w === "number" ? opt.w : W.main) * k;
  const dash = opt.dash ? ` stroke-dasharray="${f(7 * k)} ${f(6 * k)}"` : "";
  return `stroke="currentColor" stroke-width="${f(w)}" stroke-linecap="round" stroke-linejoin="round"${dash}`;
}
export function seg(a, b, opt = {}, k = 1) { return `<line x1="${f(a.x)}" y1="${f(a.y)}" x2="${f(b.x)}" y2="${f(b.y)}" ${pen(opt, k)}/>`; }
export function poly(pts, opt = {}, k = 1) {
  const fill = opt.fill === "ink" ? "currentColor" : opt.fill === "paper" ? "var(--gx-paper, #fff)" : "none";
  return `<${opt.open ? "polyline" : "polygon"} points="${pts.map((p) => f(p.x) + "," + f(p.y)).join(" ")}" fill="${fill}" ${pen(opt, k)}/>`;
}
export function circle(c, r, opt = {}, k = 1) {
  const fill = opt.fill === "ink" ? "currentColor" : opt.fill === "paper" ? "var(--gx-paper, #fff)" : "none";
  return `<circle cx="${f(c.x)}" cy="${f(c.y)}" r="${f(Math.max(0, r))}" fill="${fill}" ${pen(opt, k)}/>`;
}
// arc on circle (c, r) from a0 to a1 degrees, counterclockwise on screen
export function arc(c, r, a0, a1, opt = {}, k = 1) {
  let sweep = a1 - a0; while (sweep < 0) sweep += 360; if (sweep >= 359.999) return circle(c, r, opt, k);
  const p0 = { x: c.x + r * Math.cos(a0 * Math.PI / 180), y: c.y - r * Math.sin(a0 * Math.PI / 180) };
  const p1 = { x: c.x + r * Math.cos(a1 * Math.PI / 180), y: c.y - r * Math.sin(a1 * Math.PI / 180) };
  return `<path d="M${f(p0.x)} ${f(p0.y)}A${f(r)} ${f(r)} 0 ${sweep > 180 ? 1 : 0} 0 ${f(p1.x)} ${f(p1.y)}" fill="none" ${pen(opt, k)}/>`;
}
export function path(d, opt = {}, k = 1) {
  const fill = opt.fill === "ink" ? "currentColor" : opt.fill === "paper" ? "var(--gx-paper, #fff)" : "none";
  return `<path d="${d}" fill="${fill}" ${pen(opt, k)}/>`;
}
export function dot(p, k = 1, r = 5) { return `<circle cx="${f(p.x)}" cy="${f(p.y)}" r="${f(r * k)}" fill="currentColor"/>`; }
const escText = (s) => String(s).replace(/[&<>]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;" }[c]));
// label: single letters and short variables are italic; size in SVG units
export function text(p, s, size, opt = {}) {
  const it = opt.italic != null ? opt.italic : /^[A-Za-z]'?$|^[A-Za-z]['\u2032]?$/.test(s);
  const anchor = opt.anchor || "middle";
  const bg = opt.halo === false ? "" : ` paint-order="stroke" stroke="var(--gx-paper, #fff)" stroke-width="${f(size * 0.28)}" stroke-linejoin="round"`;
  return `<text x="${f(p.x)}" y="${f(p.y)}" font-size="${f(size)}" text-anchor="${anchor}" dominant-baseline="central" fill="currentColor"${bg} font-family="var(--gx-font, 'Helvetica Neue', Arial, sans-serif)"${it ? ' font-style="italic"' : ""}${opt.bold ? ' font-weight="700"' : ""}>${escText(s)}</text>`;
}
// tick marks across segment ab (n ticks, for equal lengths)
export function ticks(a, b, n = 1, size = 14, k = 1) {
  const m = { x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 }, L = Math.hypot(b.x - a.x, b.y - a.y) || 1;
  const u = { x: (b.x - a.x) / L, y: (b.y - a.y) / L }, v = { x: -u.y, y: u.x };
  let out = "";
  for (let i = 0; i < n; i++) {
    const o = (i - (n - 1) / 2) * 9 * k, c = { x: m.x + u.x * o, y: m.y + u.y * o };
    out += seg({ x: c.x - v.x * size * k, y: c.y - v.y * size * k }, { x: c.x + v.x * size * k, y: c.y + v.y * size * k }, { w: "main" }, k);
  }
  return out;
}
// angle mark at vertex b between rays ba and bc (n arcs); the smaller angle
export function angleMark(a, b, c, r = 40, n = 1, k = 1) {
  const d1 = (Math.atan2(-(a.y - b.y), a.x - b.x) * 180 / Math.PI + 360) % 360;
  const d2 = (Math.atan2(-(c.y - b.y), c.x - b.x) * 180 / Math.PI + 360) % 360;
  let s = d1, e = d2; if (((e - s + 360) % 360) > 180) { s = d2; e = d1; }
  let out = ""; for (let i = 0; i < n; i++) out += arc(b, (r + i * 9) * k, s, e, { w: "main" }, k);
  return out;
}
// right-angle square at b between rays ba and bc
export function rightMark(a, b, c, s = 26, k = 1) {
  const ua = norm(a, b), uc = norm(c, b), S = s * k;
  const p1 = { x: b.x + ua.x * S, y: b.y + ua.y * S }, p3 = { x: b.x + uc.x * S, y: b.y + uc.y * S };
  const p2 = { x: p1.x + uc.x * S, y: p1.y + uc.y * S };
  return poly([p1, p2, p3], { w: "main", open: true }, k);
}
function norm(p, b) { const L = Math.hypot(p.x - b.x, p.y - b.y) || 1; return { x: (p.x - b.x) / L, y: (p.y - b.y) / L }; }
// arrowhead at b pointing from a to b (for rays, lines and vectors)
export function arrow(a, b, size = 18, k = 1) {
  const u = norm(a, b), v = { x: -u.y, y: u.x }, S = size * k;
  const p1 = { x: b.x + u.x * S - v.x * S * 0.55, y: b.y + u.y * S - v.y * S * 0.55 };
  const p2 = { x: b.x + u.x * S + v.x * S * 0.55, y: b.y + u.y * S + v.y * S * 0.55 };
  return poly([p1, b, p2], { w: "main", open: true }, k);
}
// a line through a and b drawn long across the figure, with arrowheads at both ends
export function fullLine(a, b, ext = 2000, opt = {}, k = 1) {
  const u = norm(b, a), p = { x: a.x - u.x * ext, y: a.y - u.y * ext }, q = { x: a.x + u.x * ext, y: a.y + u.y * ext };
  return seg(p, q, opt, k);
}
export const svgOpen = (w, h, extra = "") => `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${w} ${h}" ${extra}>`;
