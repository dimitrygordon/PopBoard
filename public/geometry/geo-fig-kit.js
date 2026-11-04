// Geometry course: small drawing helpers shared by the static figures and the interactives.
// Every helper takes the board's drawing context g (see gx-core.js) and points in SVG units.
import * as M from "./geo-math.js";
export const P = M.P;
// a label pushed away from `from` (usually the figure's center) so it never sits on a line
export const lab = (g, p, s, from, o = {}) => g.label(p, s, { dir: M.sub(p, from), off: o.off == null ? 16 : o.off, ...o });
// a plain text line (not italic), centered on p unless anchor says otherwise
export const txt = (g, p, s, o = {}) => g.label(p, s, { off: 0, anchor: o.anchor || "middle", italic: false, ...o });
export const avg = (ps) => P(ps.reduce((s, p) => s + p.x, 0) / ps.length, ps.reduce((s, p) => s + p.y, 0) / ps.length);
// a polygon with vertex names placed outside it
export function shape(g, pts, names, o = {}) {
  g.poly(pts, o);
  const c = avg(pts);
  if (names) names.forEach((n, i) => { if (n) lab(g, pts[i], n, c); });
}
// a segment with arrowheads at both ends (a line drawn to a finite length)
export function lineArrows(g, a, b, o = {}) { g.seg(a, b, o); g.arrow(a, b); g.arrow(b, a); }
// parallel-mark arrowhead(s) at the middle of segment ab
export function parMark(g, a, b, n = 1) {
  const u = M.unit(M.sub(b, a));
  for (let i = 0; i < n; i++) { const m = M.add(M.mid(a, b), M.mul(u, (i - (n - 1) / 2) * 14 * g.k)); g.arrow(M.sub(m, M.mul(u, 10)), m); }
}
// clip the infinite line through a and b to the box [x0, x1] by [y0, y1]; null if it misses
export function clipLine(a, b, x0, y0, x1, y1) {
  const d = M.sub(b, a); let t0 = -1e9, t1 = 1e9;
  for (const [p, q] of [[-d.x, a.x - x0], [d.x, x1 - a.x], [-d.y, a.y - y0], [d.y, y1 - a.y]]) {
    if (Math.abs(p) < 1e-12) { if (q < 0) return null; continue; }
    const r = q / p; if (p < 0) t0 = Math.max(t0, r); else t1 = Math.min(t1, r);
  }
  return t0 > t1 ? null : [M.add(a, M.mul(d, t0)), M.add(a, M.mul(d, t1))];
}
// a coordinate grid: unit px per unit, origin o (screen point of (0, 0)), x and y ranges
export function grid(g, o, unit, xr, yr, { axes = true, nums = true } = {}) {
  const S = (x, y) => P(o.x + x * unit, o.y - y * unit);
  for (let x = xr[0]; x <= xr[1]; x++) g.seg(S(x, yr[0]), S(x, yr[1]), { w: "thin" });
  for (let y = yr[0]; y <= yr[1]; y++) g.seg(S(xr[0], y), S(xr[1], y), { w: "thin" });
  if (axes) {
    if (yr[0] <= 0 && yr[1] >= 0) { g.seg(S(xr[0], 0), S(xr[1] + 0.4, 0)); g.arrow(S(xr[0], 0), S(xr[1] + 0.4, 0)); txt(g, S(xr[1] + 0.4, -0.45), "x", { italic: true, small: true }); }
    if (xr[0] <= 0 && xr[1] >= 0) { g.seg(S(0, yr[0]), S(0, yr[1] + 0.4)); g.arrow(S(0, yr[0]), S(0, yr[1] + 0.4)); txt(g, S(0.4, yr[1] + 0.4), "y", { italic: true, small: true }); }
    if (nums) {
      for (let x = xr[0]; x <= xr[1]; x += 2) if (x) txt(g, S(x, -0.45), String(x).replace("-", "\u2212"), { small: true });
      for (let y = yr[0]; y <= yr[1]; y += 2) if (y) txt(g, S(-0.4, y), String(y).replace("-", "\u2212"), { small: true, anchor: "end" });
    }
  }
  return S;
}
// a simple 3D view: rotate about the vertical axis by yaw and tilt by pitch, then project orthographically
export function view(c, scale, yaw = -35, pitch = 22) {
  const cy = Math.cos(yaw * M.DEG), sy = Math.sin(yaw * M.DEG), cp = Math.cos(pitch * M.DEG), sp = Math.sin(pitch * M.DEG);
  return ([x, y, z]) => {
    const X = x * cy - y * sy, Y = x * sy + y * cy; // y is depth, z is up
    return { p: P(c.x + X * scale, c.y - (z * cp + Y * sp) * scale), depth: Y * cp - z * sp };
  };
}
// draw a convex polyhedron: hidden edges dashed (they sit behind the solid)
export function solid(g, verts, faces, pr, o = {}) {
  const V = verts.map(pr), seen = new Set(), front = new Map();
  for (const f of faces) {
    const a = V[f[0]].p, b = V[f[1]].p, c = V[f[2]].p;
    const vis = M.cross(M.sub(b, a), M.sub(c, a)) < 0;
    for (let i = 0; i < f.length; i++) {
      const e = [f[i], f[(i + 1) % f.length]].sort((x, y) => x - y).join("-");
      front.set(e, (front.get(e) || false) || vis); seen.add(e);
    }
  }
  for (const e of seen) {
    const [i, j] = e.split("-").map(Number);
    if (front.get(e)) g.seg(V[i].p, V[j].p, { w: o.w || "main" }); else if (o.hidden !== false) g.seg(V[i].p, V[j].p, { w: "thin", dash: true });
  }
  return V.map((v) => v.p);
}
// box (rectangular prism) vertices and faces, faces wound counterclockwise seen from outside
export function boxSolid(a, b, c) {
  const v = [[0, 0, 0], [a, 0, 0], [a, b, 0], [0, b, 0], [0, 0, c], [a, 0, c], [a, b, c], [0, b, c]].map(([x, y, z]) => [x - a / 2, y - b / 2, z]);
  return { v, f: [[0, 3, 2, 1], [4, 5, 6, 7], [0, 1, 5, 4], [1, 2, 6, 5], [2, 3, 7, 6], [3, 0, 4, 7]] };
}
// an ellipse drawn as a projected horizontal circle (center [x, y, z], radius r); the back half is dashed,
// or left out when back is "hide"
export function ring(g, pr, ctr, r, { back = true, w = "main" } = {}) {
  const N = 96, c0 = pr(ctr).depth, pts = [];
  for (let i = 0; i < N; i++) { const t = (i / N) * 2 * Math.PI, q = pr([ctr[0] + r * Math.cos(t), ctr[1] + r * Math.sin(t), ctr[2]]); pts.push({ p: q.p, b: q.depth > c0 + 1e-9 }); }
  let s = pts.findIndex((q, i) => q.b !== pts[(i + N - 1) % N].b); if (s < 0) s = 0;
  const run = []; let cur = null;
  for (let j = 0; j <= N; j++) {
    const q = pts[(s + j) % N];
    if (!cur || cur.b !== q.b) { if (cur) cur.pts.push(q.p); cur = { b: q.b, pts: [q.p] }; run.push(cur); } else cur.pts.push(q.p);
  }
  for (const r2 of run) {
    if (r2.pts.length < 2) continue;
    if (!r2.b || !back) g.poly(r2.pts, { open: true, w });
    else if (back !== "hide") g.poly(r2.pts, { open: true, w: "thin", dash: true });
  }
}
export { M };
