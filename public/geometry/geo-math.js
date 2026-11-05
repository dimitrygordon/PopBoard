// Geometry course: plane geometry helpers shared by the figures, the covers and the interactives.
// Points are {x, y} in SVG units (y grows downward). Pure functions, no DOM, so node can use them too.
export const P = (x, y) => ({ x, y });
export const add = (a, b) => P(a.x + b.x, a.y + b.y);
export const sub = (a, b) => P(a.x - b.x, a.y - b.y);
export const mul = (a, k) => P(a.x * k, a.y * k);
export const dot = (a, b) => a.x * b.x + a.y * b.y;
export const cross = (a, b) => a.x * b.y - a.y * b.x;
export const len = (a) => Math.hypot(a.x, a.y);
export const dist = (a, b) => Math.hypot(a.x - b.x, a.y - b.y);
export const mid = (a, b) => P((a.x + b.x) / 2, (a.y + b.y) / 2);
export const lerp = (a, b, t) => P(a.x + (b.x - a.x) * t, a.y + (b.y - a.y) * t);
export const unit = (a) => { const l = len(a) || 1; return P(a.x / l, a.y / l); };
export const perp = (a) => P(-a.y, a.x);
export const DEG = Math.PI / 180;
// polar point: angle in degrees measured counterclockwise on screen (so y is flipped)
export const polar = (c, r, deg) => P(c.x + r * Math.cos(deg * DEG), c.y - r * Math.sin(deg * DEG));
export const rotate = (p, c, deg) => {
  const a = -deg * DEG, dx = p.x - c.x, dy = p.y - c.y; // counterclockwise on screen
  return P(c.x + dx * Math.cos(a) - dy * Math.sin(a), c.y + dx * Math.sin(a) + dy * Math.cos(a));
};
export const dilate = (p, c, k) => P(c.x + (p.x - c.x) * k, c.y + (p.y - c.y) * k);
// screen-counterclockwise direction angle of b seen from a, in degrees [0, 360)
export const dirDeg = (a, b) => ((Math.atan2(-(b.y - a.y), b.x - a.x) / DEG) + 360) % 360;
// angle ABC in degrees, 0 to 180
export function angle(a, b, c) {
  const u = sub(a, b), v = sub(c, b);
  const t = dot(u, v) / ((len(u) * len(v)) || 1);
  return Math.acos(Math.max(-1, Math.min(1, t))) / DEG;
}
// foot of the perpendicular from p to line ab
export function foot(p, a, b) {
  const d = sub(b, a), t = dot(sub(p, a), d) / (dot(d, d) || 1);
  return add(a, mul(d, t));
}
export function reflect(p, a, b) { const f = foot(p, a, b); return P(2 * f.x - p.x, 2 * f.y - p.y); }
// intersection of lines ab and cd (null when parallel)
export function lineX(a, b, c, d) {
  const r = sub(b, a), s = sub(d, c), den = cross(r, s);
  if (Math.abs(den) < 1e-9) return null;
  const t = cross(sub(c, a), s) / den;
  return add(a, mul(r, t));
}
// intersections of circles (c1, r1) and (c2, r2): [] or [p, q]; p is left of c1->c2 on screen
export function circleX(c1, r1, c2, r2) {
  const d = dist(c1, c2);
  if (d < 1e-9 || d > r1 + r2 + 1e-9 || d < Math.abs(r1 - r2) - 1e-9) return [];
  const a = (r1 * r1 - r2 * r2 + d * d) / (2 * d), h = Math.sqrt(Math.max(0, r1 * r1 - a * a));
  const m = add(c1, mul(sub(c2, c1), a / d)), o = mul(perp(unit(sub(c2, c1))), h);
  return [sub(m, o), add(m, o)];
}
// intersections of line ab with circle (c, r), ordered along a->b
export function lineCircleX(a, b, c, r) {
  const d = sub(b, a), f = sub(a, c);
  const A = dot(d, d), B = 2 * dot(f, d), C = dot(f, f) - r * r, disc = B * B - 4 * A * C;
  if (disc < 0 || A < 1e-12) return [];
  const s = Math.sqrt(disc);
  return [(-B - s) / (2 * A), (-B + s) / (2 * A)].map((t) => add(a, mul(d, t)));
}
// triangle centers
export function circumcenter(a, b, c) {
  const d = 2 * (a.x * (b.y - c.y) + b.x * (c.y - a.y) + c.x * (a.y - b.y));
  if (Math.abs(d) < 1e-9) return null;
  const A = a.x * a.x + a.y * a.y, B = b.x * b.x + b.y * b.y, C = c.x * c.x + c.y * c.y;
  return P((A * (b.y - c.y) + B * (c.y - a.y) + C * (a.y - b.y)) / d, (A * (c.x - b.x) + B * (a.x - c.x) + C * (b.x - a.x)) / d);
}
export function incenter(a, b, c) {
  const la = dist(b, c), lb = dist(a, c), lc = dist(a, b), s = la + lb + lc;
  return P((la * a.x + lb * b.x + lc * c.x) / s, (la * a.y + lb * b.y + lc * c.y) / s);
}
export const centroid = (a, b, c) => P((a.x + b.x + c.x) / 3, (a.y + b.y + c.y) / 3);
export function orthocenter(a, b, c) {
  const o = circumcenter(a, b, c);
  return o ? P(a.x + b.x + c.x - 2 * o.x, a.y + b.y + c.y - 2 * o.y) : null;
}
export const area = (pts) => Math.abs(pts.reduce((s, p, i) => s + cross(p, pts[(i + 1) % pts.length]), 0)) / 2;
export const perimeter = (pts) => pts.reduce((s, p, i) => s + dist(p, pts[(i + 1) % pts.length]), 0);
export const regular = (c, r, n, startDeg = 90) => Array.from({ length: n }, (_, i) => polar(c, r, startDeg + (360 * i) / n));
export const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
export const round = (v, d = 1) => { const k = 10 ** d; return Math.round(v * k) / k; };
