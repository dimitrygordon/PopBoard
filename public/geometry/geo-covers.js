// Geometry course unit covers: one ornate rosette or fractal per unit, drawn from exact constructions.
// Built to geometry/covers/uNN.svg by tools/geometry/build.mjs. Black ink on white; dark mode inverts in CSS.
// To use finished art instead, point a unit or lesson at another file in tools/geometry/art-map.json.
import { P, polar, regular, mid, lerp, rotate, add, sub, mul, perp, dist } from "./geo-math.js";
import { seg, poly, circle, arc, svgOpen } from "./geo-svg.js";

const C = P(800, 450), K = 1.7; // center; stroke scale so lines read 1, 2, 3 px on a 960-wide card
const S = { thin: { w: "thin" }, main: { w: "main" }, bold: { w: "bold" } };
const ln = (a, b, o = S.main) => seg(a, b, o, K);
const pg = (pts, o = S.main) => poly(pts, o, K);
const ci = (c, r, o = S.main) => circle(c, r, o, K);

// Unit 1: Seed and Flower of Life (circles of equal radius centered on the previous circles' crossings)
function u1() {
  const r = 110; let out = ci(C, r * 3, S.bold);
  const centers = [C];
  for (let ring = 1; ring <= 2; ring++) for (let i = 0; i < 6 * ring; i++) {
    const side = Math.floor(i / ring), step = i % ring;
    const a = polar(C, r * ring, 90 + side * 60), b = polar(C, r * ring, 90 + (side + 1) * 60);
    centers.push(lerp(a, b, step / ring));
  }
  for (const c of centers) out += ci(c, r, dist(c, C) > r * 1.5 ? S.thin : S.main);
  return out;
}
// Unit 2: twelve points on a circle joined as the star {12/5}, with the construction circle and its hexagon
function u2() {
  const R = 330, pts = regular(C, R, 12, 90); let out = ci(C, R, S.bold) + ci(C, R * 0.5, S.thin);
  for (let i = 0; i < 12; i++) out += ln(pts[i], pts[(i + 5) % 12], S.main);
  out += pg(regular(C, R, 6, 90), S.thin);
  for (const p of pts) out += ci(p, 10, S.thin);
  return out;
}
// Unit 3: a square turned in 15 degree steps (rotation symmetry of order 24 for the whole rosette)
function u3() {
  let out = ci(C, 360, S.thin);
  for (let i = 0; i < 6; i++) out += pg(regular(C, 340, 4, 45 + i * 15), i === 0 ? S.bold : S.main);
  for (let i = 0; i < 6; i++) out += pg(regular(C, 170, 4, 45 + i * 15 + 7.5), S.thin);
  return out;
}
// Unit 4: Sierpinski triangle, stage 5
function u4() {
  const base = regular(P(800, 500), 400, 3, 90); let out = pg(base, S.bold);
  const rec = (a, b, c, d) => { if (!d) return; const ab = mid(a, b), bc = mid(b, c), ca = mid(c, a); out += pg([ab, bc, ca], d > 3 ? S.main : S.thin); rec(a, ab, ca, d - 1); rec(ab, b, bc, d - 1); rec(ca, bc, c, d - 1); };
  rec(...base, 5); return out;
}
// Unit 5: whirling triangles: each triangle's vertices sit one tenth of the way along the previous sides
function u5() {
  let t = regular(P(800, 490), 400, 3, 90), out = "";
  for (let i = 0; i < 26; i++) { out += pg(t, i === 0 ? S.bold : S.thin); t = t.map((p, j) => lerp(p, t[(j + 1) % 3], 0.1)); }
  return out;
}
// Unit 6: star polygons {7/2} and {7/3} on one circle, with the heptagon
function u6() {
  const R = 340, pts = regular(C, R, 7, 90); let out = ci(C, R, S.bold) + pg(pts, S.main);
  for (let i = 0; i < 7; i++) { out += ln(pts[i], pts[(i + 2) % 7], S.main); out += ln(pts[i], pts[(i + 3) % 7], S.thin); }
  return out;
}
// Unit 7: Pythagoras tree with a 45 degree split (right isosceles triangles), stage 7
function u7() {
  let out = "";
  const rec = (a, b, d) => { // square on segment ab (a to b left to right along the base), growing upward
    const v = sub(b, a), n = P(v.y, -v.x), c = add(b, n), e = add(a, n);
    out += pg([a, b, c, e], d > 5 ? S.main : S.thin);
    if (!d) return;
    const m = mid(e, c), apex = add(m, mul(P(n.x, n.y), 0.5));
    rec(e, apex, d - 1); rec(apex, c, d - 1);
  };
  rec(P(720, 870), P(880, 870), 7); return out;
}
// Unit 8: Koch snowflake, stage 4
function u8() {
  let pts = regular(P(800, 470), 360, 3, 90);
  for (let s = 0; s < 4; s++) {
    const nx = [];
    for (let i = 0; i < pts.length; i++) { const a = pts[i], b = pts[(i + 1) % pts.length], p = lerp(a, b, 1 / 3), q = lerp(a, b, 2 / 3); nx.push(a, p, rotate(q, p, 60), q); }
    pts = nx;
  }
  return pg(pts, S.bold) + pg(regular(P(800, 470), 360, 3, 90), S.thin);
}
// Unit 9: spiral of Theodorus: right triangles with legs 1 and sqrt(n), hypotenuse sqrt(n + 1)
function u9() {
  const u = 92, c = P(800, 470); let out = "", p = P(c.x + u, c.y), d = 0;
  for (let n = 1; n <= 17; n++) {
    const r = Math.sqrt(n), q = polar(c, u * Math.sqrt(n + 1), d + Math.atan(1 / r) * 180 / Math.PI);
    out += ln(c, p, S.thin) + ln(p, q, S.main);
    d += Math.atan(1 / r) * 180 / Math.PI; p = q;
  }
  return out + ln(c, p, S.thin) + ci(c, u * Math.sqrt(18), S.thin);
}
// Unit 10: 12 circles of radius R/2 through the center, centers on a circle (a classic rosette)
function u10() {
  const R = 360; let out = ci(C, R, S.bold);
  for (let i = 0; i < 12; i++) out += ci(polar(C, R / 2, i * 30), R / 2, i % 2 ? S.thin : S.main);
  return out;
}
// Unit 11: regular 3- to 12-gons inscribed in one circle (the polygons close in on the circle)
function u11() {
  const R = 360; let out = ci(C, R, S.bold);
  for (let n = 3; n <= 12; n++) out += pg(regular(C, R, n, 90), n % 3 ? S.thin : S.main);
  return out;
}
// Unit 12: Metatron's cube: 13 circles of the fruit of life joined center to center
function u12() {
  const r = 66; const cs = [C, ...regular(C, 2 * r, 6, 90), ...regular(C, 4 * r, 6, 90)];
  let out = "";
  for (let i = 0; i < cs.length; i++) for (let j = i + 1; j < cs.length; j++) out += ln(cs[i], cs[j], S.thin);
  for (const c of cs) out += ci(c, r, S.main);
  return out;
}
export const COVERS = { 1: u1, 2: u2, 3: u3, 4: u4, 5: u5, 6: u6, 7: u7, 8: u8, 9: u9, 10: u10, 11: u11, 12: u12 };
// The course card: the six-petal rosette (2.12) inside a hexagon, with the compass circle
function course() {
  const r = 150; let out = ci(C, 2 * r, S.bold) + pg(regular(C, 2 * r, 6, 90), S.thin) + ci(C, r, S.main);
  for (const p of regular(C, r, 6, 90)) out += ci(p, r, S.main);
  for (const p of regular(C, r * Math.sqrt(3), 6, 0)) { const a = Math.atan2(-(C.y - p.y), C.x - p.x) * 180 / Math.PI; out += arc(p, r, a - 60, a + 60, S.thin, K); }
  return out;
}
export function coverSvg(n) {
  const body = n === "course" ? course() : COVERS[n]();
  return `${svgOpen(1600, 900, 'width="1600" height="900" color="#111111"')}<rect width="1600" height="900" fill="#ffffff"/>${body}</svg>\n`;
}
