// Geometry course figures, Units 9 to 12. Each figure draws on a 1000 x 700 board with exact coordinates.
// Solids use an orthographic view (geo-fig-kit.js view); hidden edges are dashed.
import { P, M, lab, txt, avg, shape, lineArrows, parMark, grid, view, solid, boxSolid, ring } from "./geo-fig-kit.js";

function rightTri(g, A, B, C, names) { shape(g, [A, B, C], names, { w: "bold" }); g.right(A, C, B); }
const deg = (x) => `${x}\u00b0`;
// Platonic solid vertices (unit-ish) and faces found from the convex hull of the vertex set
const PHI = (1 + Math.sqrt(5)) / 2;
const PLATO = {
  tetra: [[1, 1, 1], [1, -1, -1], [-1, 1, -1], [-1, -1, 1]],
  cube: [[-1, -1, -1], [1, -1, -1], [1, 1, -1], [-1, 1, -1], [-1, -1, 1], [1, -1, 1], [1, 1, 1], [-1, 1, 1]],
  octa: [[1, 0, 0], [-1, 0, 0], [0, 1, 0], [0, -1, 0], [0, 0, 1], [0, 0, -1]],
  dodeca: [...[-1, 1].flatMap((a) => [-1, 1].flatMap((b) => [-1, 1].map((c) => [a, b, c]))), ...[-1, 1].flatMap((a) => [-1, 1].flatMap((b) => [[0, a / PHI, b * PHI], [a / PHI, b * PHI, 0], [a * PHI, 0, b / PHI]]))],
  icosa: [-1, 1].flatMap((a) => [-1, 1].flatMap((b) => [[0, a, b * PHI], [a, b * PHI, 0], [a * PHI, 0, b]]))
};
// faces of a convex hull: every plane through 3+ vertices with all others on one side
function hullFaces(V) {
  const sub = (a, b) => a.map((x, i) => x - b[i]), crs = (a, b) => [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]], dt = (a, b) => a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
  const faces = [], keys = new Set(), n = V.length;
  for (let i = 0; i < n; i++) for (let j = i + 1; j < n; j++) for (let k = j + 1; k < n; k++) {
    let nr = crs(sub(V[j], V[i]), sub(V[k], V[i])); if (dt(nr, nr) < 1e-9) continue;
    const d = dt(nr, V[i]); let pos = 0, neg = 0; const on = [];
    V.forEach((v, m) => { const s = dt(nr, v) - d; if (s > 1e-6) pos++; else if (s < -1e-6) neg++; else on.push(m); });
    if (pos && neg) continue; if (pos) nr = nr.map((x) => -x);
    const key = on.slice().sort((a, b) => a - b).join(","); if (keys.has(key)) continue; keys.add(key);
    // order the face's vertices around its center, counterclockwise seen from outside
    const c = on.reduce((s, m) => s.map((x, t) => x + V[m][t] / on.length), [0, 0, 0]);
    const u = sub(V[on[0]], c), w = crs(nr, u);
    on.sort((a, b) => Math.atan2(dt(sub(V[a], c), w), dt(sub(V[a], c), u)) - Math.atan2(dt(sub(V[b], c), w), dt(sub(V[b], c), u)));
    faces.push(on);
  }
  return faces;
}
export function drawPlato(g, name, c, s, yaw = -28, pitch = 20) {
  const V = PLATO[name]; return solid(g, V, hullFaces(V), view(c, s, yaw, pitch));
}
function cylinder(g, pr, r, h, z0 = 0) {
  ring(g, pr, [0, 0, z0], r); ring(g, pr, [0, 0, z0 + h], r, { back: false });
  const e = (z) => [pr([-r * Math.cos(yawOf(pr)), r * Math.sin(yawOf(pr)), z]).p, pr([r * Math.cos(yawOf(pr)), -r * Math.sin(yawOf(pr)), z]).p];
  const [a0, b0] = e(z0), [a1, b1] = e(z0 + h); g.seg(a0, a1); g.seg(b0, b1);
}
// the silhouette of a vertical cylinder is where the view direction is tangent: angle set by the yaw
const yawOf = (pr) => pr.yaw || 0;
function viewY(c, s, yaw = -30, pitch = 20) { const pr = view(c, s, yaw, pitch); pr.yaw = yaw * M.DEG; return pr; }

export const FIGS = {
  altitude(g) {
    const A = P(100, 560), B = P(900, 560), t = (Math.PI / 180) * 32, C = P(A.x + 800 * Math.cos(t) ** 2, 560 - 800 * Math.cos(t) * Math.sin(t)), D = P(C.x, 560);
    shape(g, [A, B, C], ["A", "B", "C"], { w: "bold" }); g.right(A, C, B); g.seg(C, D); g.right(B, D, C); g.dot(D); lab(g, D, "D", C);
  },
  tri4545(g) {
    const s = 420, A = P(290, 600), B = P(A.x + s, 600), C = P(A.x + s, 600 - s), D = P(A.x, 600 - s);
    g.poly([A, B, C, D], { w: "thin", dash: true }); shape(g, [A, B, C], null, { w: "bold" }); g.right(A, B, C);
    g.angle(B, A, C, 1, 70); g.angle(A, C, B, 1, 70);
    txt(g, P(A.x + s / 2, 640), "x", { italic: true }); txt(g, P(B.x + 34, 600 - s / 2), "x", { italic: true }); txt(g, P(A.x + s / 2 - 40, 600 - s / 2 - 30), "x\u221a2", { italic: true });
    txt(g, M.polar(A, 120, 22), deg(45), { small: true });
  },
  tri3060(g) {
    const s = 480, B = P(260, 610), C = P(B.x + s, 610), A = P(B.x + s / 2, 610 - s * Math.sqrt(3) / 2), D = P(A.x, 610);
    g.poly([B, C, A], { w: "thin", dash: true }); shape(g, [A, B, D], null, { w: "bold" }); g.right(B, D, A);
    txt(g, P((B.x + D.x) / 2, 650), "x", { italic: true }); txt(g, P(A.x + 40, 430), "x\u221a3", { italic: true }); txt(g, P(380, 360), "2x", { italic: true });
    txt(g, M.polar(B, 110, 30), deg(60), { small: true }); txt(g, M.polar(A, 130, 255), deg(30), { small: true });
  },
  ratios(g) {
    const A = P(90, 600), th = 35;
    for (const L of [260, 480, 760]) { const B = P(A.x + L, 600), C = P(A.x + L, 600 - L * Math.tan(th * M.DEG)); g.seg(B, C, { w: L === 760 ? "bold" : "main" }); g.right(A, B, C); }
    g.seg(A, P(870, 600), { w: "bold" }); g.seg(A, M.polar(A, 760 / Math.cos(th * M.DEG), th), { w: "bold" }); g.angle(P(900, 600), A, M.polar(A, 300, th), 1, 90);
    txt(g, M.polar(A, 150, 15), deg(35), { small: true }); txt(g, P(500, 660), "opposite / adjacent \u2248 0.70 in every one", { small: true });
  },
  tangent(g) {
    const A = P(130, 580), C = P(780, 580), B = P(780, 580 - 650 * 0.75);
    rightTri(g, A, B, C, ["A", "B", "C"]); g.angle(C, A, B, 1, 90);
    txt(g, P(455, 625), "adjacent 8", { small: true }); txt(g, P(870, 400), "opposite 6", { small: true, anchor: "middle" }); txt(g, P(500, 670), "tan A = 6/8 = 0.75", { small: true });
  },
  sincos(g) {
    const A = P(130, 580), C = P(800, 580), B = P(800, 160);
    rightTri(g, A, B, C, ["A", "B", "C"]); g.angle(C, A, B, 1, 90);
    txt(g, P(465, 625), "adjacent", { small: true }); txt(g, P(870, 370), "opposite", { small: true }); txt(g, P(410, 320), "hypotenuse", { small: true });
    txt(g, P(500, 680), "SOH CAH TOA", { small: true, bold: true });
  },
  inverse(g) {
    const A = P(80, 560), B = P(920, 560), C = P(920, 560 - 840 / 12);
    g.poly([A, B, C], { w: "bold" }); g.right(A, B, C); g.angle(B, A, C, 1, 200);
    txt(g, P(500, 610), "run 12", { small: true }); txt(g, P(950, 520), "rise 1", { small: true, anchor: "start" }); txt(g, P(340, 520), "4.76\u00b0", { small: true });
    txt(g, P(500, 300), "ADA ramp: slope at most 1 : 12", { small: true });
  },
  slopetri(g) {
    const S = grid(g, P(160, 600), 60, [0, 13], [0, 8], { nums: false });
    const a = S(1, 1), b = S(11, 6); g.seg(M.lerp(a, b, -0.05), M.lerp(a, b, 1.15), { w: "bold" });
    const c = S(11, 1); g.seg(a, c, { dash: true }); g.seg(c, b, { dash: true }); g.right(a, c, b); g.angle(c, a, b, 1, 120);
    txt(g, S(6, 0.5), "run 10", { small: true }); txt(g, S(11.9, 3.5), "rise 5", { small: true }); txt(g, S(4.2, 1.6), "\u03b8", { italic: true });
    txt(g, S(5, 7.3), "slope = tan \u03b8 = 0.5", { small: true });
  },
  elevation(g) {
    const eye = P(160, 500), base = 590, top = P(820, 140);
    g.seg(P(40, base), P(960, base), { w: "bold" }); g.seg(P(160, base), eye); g.circle(P(160, 482), 18);
    g.seg(P(820, base), top, { w: "bold" }); g.circle(P(820, 200), 60);
    g.seg(eye, P(820, 500), { dash: true, w: "thin" }); g.seg(eye, top); g.angle(P(820, 500), eye, top, 1, 150);
    txt(g, P(490, 535), "30 m", { small: true }); txt(g, P(330, 470), "40\u00b0", { small: true }); txt(g, P(130, 545), "1.5 m", { small: true, anchor: "end" }); txt(g, P(500, 680), "not to scale", { small: true });
  },
  mixed(g) {
    const A = P(150, 600), C = P(150 + 12 * 55, 600), B = P(150 + 12 * 55, 600 - 5 * 55);
    rightTri(g, A, B, C, ["A", "B", "C"]); txt(g, P((A.x + C.x) / 2, 640), "12", { small: true }); txt(g, P(C.x + 30, 460), "5", { small: true }); txt(g, P(460, 430), "13", { small: true });
  },
  lawsines(g) {
    const A = P(120, 580), B = P(880, 580), C = P(330, 160), F = P(330, 580);
    shape(g, [A, B, C], ["A", "B", "C"], { w: "bold" }); g.seg(C, F, { dash: true }); g.right(B, F, C);
    txt(g, P(500, 620), "c", { italic: true }); txt(g, P(200, 360), "b", { italic: true }); txt(g, P(640, 360), "a", { italic: true }); txt(g, P(355, 400), "h = b sin A", { italic: true, anchor: "start" });
  },
  circlevocab(g) {
    const O = P(440, 350), r = 270; g.circle(O, r, { w: "bold" }); g.dot(O); lab(g, O, "O", P(O.x + 30, O.y - 40));
    const R = M.polar(O, r, 200); g.seg(O, R); txt(g, M.lerp(O, R, 0.5), "radius", { small: true, dy: -1 });
    const d0 = M.polar(O, r, 70), d1 = M.polar(O, r, 250); g.seg(d0, d1); txt(g, M.add(M.lerp(d0, d1, 0.3), P(70, 0)), "diameter", { small: true });
    const c0 = M.polar(O, r, 300), c1 = M.polar(O, r, 350); g.seg(c0, c1); txt(g, M.add(M.mid(c0, c1), P(-60, 0)), "chord", { small: true });
    const T = M.polar(O, r, 0), tu = P(0, 1); g.seg(M.add(T, P(0, -250)), M.add(T, P(0, 250))); g.right(O, T, M.add(T, P(0, -50))); txt(g, M.add(T, P(70, -200)), "tangent", { small: true });
    const s0 = M.polar(O, r, 110), s1 = M.polar(O, r, 160); g.seg(M.lerp(s1, s0, -0.6), M.lerp(s1, s0, 1.6)); txt(g, M.add(M.lerp(s1, s0, 1.5), P(80, 0)), "secant", { small: true });
    g.arc(O, r + 18, 300, 350, { w: "bold" }); txt(g, M.polar(O, r + 60, 325), "arc", { small: true });
  },
  chordbis(g) {
    const O = P(500, 330), r = 280, A = M.polar(O, r, 215), B = M.polar(O, r, 325), Mm = M.mid(A, B);
    g.circle(O, r); g.seg(A, B, { w: "bold" }); g.seg(O, A, { w: "thin" }); g.seg(O, B, { w: "thin" }); g.seg(O, Mm); g.right(B, Mm, O);
    g.ticks(A, Mm, 1); g.ticks(Mm, B, 1); [O, A, B, Mm].forEach((p) => g.dot(p)); lab(g, O, "O", P(500, 600)); lab(g, A, "A", O); lab(g, B, "B", O); lab(g, Mm, "M", O);
  },
  tangentline(g) {
    const O = P(330, 360), r = 220, T = M.polar(O, r, 60), u = M.perp(M.unit(M.sub(T, O))), Pp = M.add(T, M.mul(u, 420));
    g.circle(O, r); g.seg(O, T); g.seg(M.add(T, M.mul(u, -300)), M.add(T, M.mul(u, 500)), { w: "bold" }); g.right(O, T, Pp); g.seg(O, Pp, { dash: true, w: "thin" });
    [O, T, Pp].forEach((p) => g.dot(p)); lab(g, O, "O", P(O.x, 600)); lab(g, T, "T", O); lab(g, Pp, "P", O);
  },
  central(g) {
    const O = P(500, 350), r = 280, A = M.polar(O, r, 20), B = M.polar(O, r, 110);
    g.circle(O, r); g.seg(O, A); g.seg(O, B); g.arc(O, r, 20, 110, { w: "bold" }); g.angle(A, O, B, 1, 60);
    [O, A, B].forEach((p) => g.dot(p)); lab(g, O, "O", P(O.x + 40, O.y + 60)); lab(g, A, "A", O); lab(g, B, "B", O);
    txt(g, M.polar(O, 105, 65), deg(90), { small: true }); txt(g, M.polar(O, r + 50, 65), "arc AB = 90\u00b0", { small: true });
  },
  inscribed(g) {
    const O = P(500, 350), r = 280, A = M.polar(O, r, 340), C = M.polar(O, r, 60), B = M.polar(O, r, 210);
    g.circle(O, r); g.seg(B, A, { w: "bold" }); g.seg(B, C, { w: "bold" }); g.seg(O, A, { w: "thin" }); g.seg(O, C, { w: "thin" });
    g.arc(O, r, 340, 60, { w: "bold" }); g.angle(A, B, C, 1, 70); g.angle(A, O, C, 2, 50);
    [O, A, B, C].forEach((p) => g.dot(p)); lab(g, O, "O", P(O.x - 40, O.y + 50)); lab(g, A, "A", O); lab(g, B, "B", O); lab(g, C, "C", O);
  },
  cyclic(g) {
    const O = P(500, 350), r = 280, Q = [200, 300, 20, 110].map((d) => M.polar(O, r, d));
    g.circle(O, r); shape(g, Q, ["A", "B", "C", "D"], { w: "bold" }); g.angle(Q[3], Q[0], Q[1], 1, 50); g.angle(Q[1], Q[2], Q[3], 2, 50);
    txt(g, P(500, 680), "angle A + angle C = 180", { small: true });
  },
  circumscribed(g) {
    const O = P(320, 350), r = 190, Pp = P(860, 350), d = M.dist(O, Pp), a = Math.acos(r / d) / M.DEG, A = M.polar(O, r, a), B = M.polar(O, r, -a);
    g.circle(O, r); g.seg(Pp, A, { w: "bold" }); g.seg(Pp, B, { w: "bold" }); g.seg(O, A); g.seg(O, B); g.right(O, A, Pp); g.right(O, B, Pp);
    g.ticks(Pp, A, 1); g.ticks(Pp, B, 1); g.angle(A, Pp, B, 1, 80);
    [O, A, B, Pp].forEach((p) => g.dot(p)); lab(g, O, "O", Pp); lab(g, A, "A", O); lab(g, B, "B", O); lab(g, Pp, "P", O);
  },
  secangles(g) {
    const O = P(360, 350), r = 250, Pp = P(900, 330);
    g.circle(O, r);
    for (const d of [-6, 18]) { const dir = M.polar(Pp, 1, 180 + d), hits = M.lineCircleX(Pp, M.add(Pp, M.mul(M.sub(dir, Pp), 100)), O, r); if (hits.length === 2) { g.seg(Pp, hits[1], { w: "bold" }); hits.forEach((h) => g.dot(h)); } }
    g.dot(Pp); lab(g, Pp, "P", O); txt(g, P(560, 670), "angle P = (far arc \u2212 near arc) / 2", { small: true });
  },
  seglengths(g) {
    const O = P(500, 350), r = 280, A = M.polar(O, r, 160), B = M.polar(O, r, 330), C = M.polar(O, r, 80), D = M.polar(O, r, 245), E = M.lineX(A, B, C, D);
    g.circle(O, r); g.seg(A, B, { w: "bold" }); g.seg(C, D, { w: "bold" }); [A, B, C, D, E].forEach((p) => g.dot(p));
    lab(g, A, "A", O); lab(g, B, "B", O); lab(g, C, "C", O); lab(g, D, "D", O); lab(g, E, "E", P(E.x + 50, E.y + 80));
    txt(g, P(500, 680), "AE \u00b7 EB = CE \u00b7 ED", { small: true });
  },
  circum(g) {
    const T = [P(200, 520), P(780, 560), P(420, 160)], O = M.circumcenter(...T), r = M.dist(O, T[0]);
    g.circle(O, r, { w: "main" }); shape(g, T, ["A", "B", "C"], { w: "bold" });
    for (let i = 0; i < 3; i++) { const a = T[i], b = T[(i + 1) % 3], m = M.mid(a, b); g.seg(O, M.lerp(O, m, 1.25), { dash: true, w: "thin" }); g.right(b, m, O); }
    g.dot(O); lab(g, O, "O", P(O.x - 40, O.y + 60));
  },
  incircle(g) {
    const T = [P(130, 590), P(870, 590), P(380, 120)], I = M.incenter(...T), F = M.foot(I, T[0], T[1]), r = M.dist(I, F);
    shape(g, T, ["A", "B", "C"], { w: "bold" }); g.circle(I, r);
    for (const p of T) g.seg(p, I, { dash: true, w: "thin" }); g.seg(I, F); g.right(T[1], F, I); g.dot(I); lab(g, I, "I", P(I.x + 30, I.y + 60));
  },
  euler(g) {
    const T = [P(160, 600), P(860, 600), P(330, 130)], O = M.circumcenter(...T), G = M.centroid(...T), H = M.orthocenter(...T);
    shape(g, T, ["A", "B", "C"], { w: "bold" }); g.seg(M.lerp(H, O, -0.4), M.lerp(H, O, 1.5), { dash: true });
    for (const [p, n] of [[O, "O"], [G, "G"], [H, "H"]]) { g.dot(p, 7); lab(g, p, n, P(p.x + 100, p.y + 60)); }
    txt(g, P(700, 660), "HG = 2 GO", { small: true });
  },
  napoleon(g) {
    const T = [P(330, 440), P(610, 470), P(430, 290)].map((p) => M.dilate(p, P(457, 400), 1.15)), cs = [];
    for (let i = 0; i < 3; i++) { const a = T[i], b = T[(i + 1) % 3], G = M.centroid(...T), p1 = M.rotate(b, a, 60), p2 = M.rotate(b, a, -60), apex = M.dist(p1, G) > M.dist(p2, G) ? p1 : p2; g.poly([a, apex, b], { w: "thin" }); cs.push(M.centroid(a, b, apex)); }
    g.poly(T, { w: "bold" }); g.poly(cs, { w: "bold" }); cs.forEach((p) => g.dot(p)); for (let i = 0; i < 3; i++) g.ticks(cs[i], cs[(i + 1) % 3], 1);
  },
  polyperim(g) {
    const O = P(500, 360), r = 290, V = M.regular(O, r, 8, 90);
    g.circle(O, r, { w: "thin" }); g.poly(V, { w: "bold" }); g.seg(O, V[0]); g.seg(O, V[1]); g.angle(V[0], O, V[1], 1, 60);
    const m = M.mid(V[0], V[1]); g.seg(O, m, { dash: true, w: "thin" }); g.right(V[0], m, O); g.dot(O);
    txt(g, M.polar(O, 95, 112.5), "45\u00b0", { small: true }); txt(g, M.add(M.mid(O, V[0]), P(30, 0)), "r", { italic: true });
  },
  apothem(g) {
    const O = P(500, 360), V = M.regular(O, 300, 6, 0);
    g.poly(V, { w: "bold" }); V.forEach((p) => g.seg(O, p, { w: "thin" })); const m = M.mid(V[4], V[5]); g.seg(O, m); g.right(V[5], m, O);
    txt(g, M.add(M.mid(O, m), P(26, 0)), "a", { italic: true }); txt(g, M.add(m, P(0, 30)), "s", { italic: true });
  },
  archimedes(g) {
    const O = P(500, 350), r = 250; g.circle(O, r, { w: "bold" }); g.poly(M.regular(O, r, 6, 90)); g.poly(M.regular(O, r / Math.cos(Math.PI / 6), 6, 90));
    txt(g, P(500, 680), "inscribed < circumference < circumscribed", { small: true });
  },
  circumference(g) {
    const O = P(500, 340), r = 270; g.circle(O, r, { w: "bold" }); const a = P(O.x - r, O.y), b = P(O.x + r, O.y); g.seg(a, b); g.dot(O);
    txt(g, P(500, 310), "d", { italic: true }); txt(g, P(500, 670), "C = \u03c0d = 2\u03c0r", { small: true });
  },
  wedges(g) {
    const n = 12, r = 200, w = (Math.PI * r) / (n / 2), x0 = 500 - (n / 2) * w / 2 - w / 4, y = 470;
    for (let i = 0; i < n; i++) {
      const up = i % 2 === 0, cx = x0 + (i * w) / 2 + w / 2, apex = up ? P(cx, y - r) : P(cx, y), half = (180 / n);
      const arcC = up ? apex : apex, a0 = up ? 270 - half : 90 - half, a1 = up ? 270 + half : 90 + half;
      const c = apex;
      const p0 = M.polar(c, r, a0), p1 = M.polar(c, r, a1);
      g.seg(c, p0); g.seg(c, p1); g.arc(c, r, a0, a1);
    }
    txt(g, P(500, 560), "base \u2248 \u03c0r", { small: true }); txt(g, P(170, 370), "r", { italic: true });
    txt(g, P(500, 640), "A = \u03c0r \u00b7 r = \u03c0r\u00b2", { small: true });
  },
  arclength(g) {
    const O = P(500, 360), r = 270, A = M.polar(O, r, 30), B = M.polar(O, r, 90);
    g.circle(O, r); g.seg(O, A); g.seg(O, B); g.arc(O, r, 30, 90, { w: "bold" }); g.angle(A, O, B, 1, 60); g.dot(O);
    txt(g, M.polar(O, 100, 60), "60\u00b0", { small: true }); txt(g, M.polar(O, r + 50, 60), "60/360 of 2\u03c0r", { small: true });
  },
  sector(g) {
    const O = P(500, 360), r = 270, A = M.polar(O, r, 0), B = M.polar(O, r, 90);
    g.circle(O, r, { w: "thin" }); g.seg(O, A, { w: "bold" }); g.seg(O, B, { w: "bold" }); g.arc(O, r, 0, 90, { w: "bold" }); g.seg(A, B, { dash: true });
    g.right(A, O, B); txt(g, M.polar(O, r * 0.82, 45), "segment", { small: true }); txt(g, M.polar(O, r * 0.35, 45), "triangle", { small: true });
  },
  radian(g) {
    const O = P(500, 360), r = 260, A = M.polar(O, r, 0), B = M.polar(O, r, 180 / Math.PI);
    g.circle(O, r); g.seg(O, A, { w: "bold" }); g.seg(O, B, { w: "bold" }); g.arc(O, r, 0, 180 / Math.PI, { w: "bold" }); g.angle(A, O, B, 1, 60);
    txt(g, M.polar(O, 100, 28), "1", { small: true }); txt(g, M.add(M.mid(O, A), P(0, 30)), "r", { italic: true }); txt(g, M.polar(O, r + 40, 28), "r", { italic: true });
  },
  space(g) {
    const pr = view(P(500, 520), 1.6, -30, 22), { v, f } = boxSolid(300, 220, 220), Vp = solid(g, v, f, pr);
    g.seg(Vp[4], Vp[5], { w: "bold" }); g.seg(Vp[2], Vp[6], { w: "bold" });
    txt(g, P(500, 670), "the two bold edges are skew", { small: true });
  },
  cross(g) {
    const pr = view(P(500, 520), 1.35, -35, 24), s = 300, { v, f } = boxSolid(s, s, s), Vp = solid(g, v, f, pr, { w: "main" });
    const h = s / 2, mids = [[1, 1, 0], [0, 1, 1], [-1, 0, 1], [-1, -1, 0], [0, -1, -1], [1, 0, -1]].map(([X, Y, Z]) => [X * h, Y * h, h + Z * h]).map(([x, y, z]) => pr([x, y, z]).p);
    g.poly(mids, { w: "bold" });
    txt(g, P(500, 670), "a regular hexagon cross section", { small: true });
  },
  cavalieri(g) {
    const n = 9, w = 220, hgt = 34;
    for (let i = 0; i < n; i++) { const y = 600 - (i + 1) * hgt; g.poly([P(120, y), P(120 + w, y), P(120 + w, y + hgt), P(120, y + hgt)]); const sh = i * 26; g.poly([P(560 + sh, y), P(560 + w + sh, y), P(560 + w + sh, y + hgt), P(560 + sh, y + hgt)]); }
    txt(g, P(500, 660), "same slices at every height, same volume", { small: true });
  },
  prism(g) {
    const pr = view(P(270, 540), 1.2, -30, 22), { v, f } = boxSolid(240, 160, 220); solid(g, v, f, pr);
    const pc = viewY(P(730, 560), 1.2, -30, 22); cylinder(g, pc, 110, 260);
    txt(g, P(500, 670), "V = Bh", { small: true });
  },
  pyramid(g) {
    const pr = view(P(280, 560), 1.3, -32, 22), s = 260, { v, f } = boxSolid(s, s, s); solid(g, v, f, pr, { w: "thin" });
    const apex = [s / 2, s / 2, s], base = [[-s / 2, -s / 2, 0], [s / 2, -s / 2, 0], [s / 2, s / 2, 0], [-s / 2, s / 2, 0]];
    solid(g, [...base, apex], [[0, 3, 2, 1], [0, 1, 4], [1, 2, 4], [2, 3, 4], [3, 0, 4]], pr, { w: "bold" });
    const pc = viewY(P(740, 560), 1.3, -30, 22), r = 110, h = 260; cylinder(g, pc, r, h);
    const tip = pc([0, 0, h]).p, e0 = pc([-r * Math.cos(pc.yaw), r * Math.sin(pc.yaw), 0]).p, e1 = pc([r * Math.cos(pc.yaw), -r * Math.sin(pc.yaw), 0]).p;
    g.seg(tip, e0, { w: "bold" }); g.seg(tip, e1, { w: "bold" });
    txt(g, P(500, 670), "V = (1/3)Bh", { small: true });
  },
  sphere(g) {
    const pr = viewY(P(270, 540), 1, -30, 18), r = 200;
    ring(g, pr, [0, 0, 0], r); const pts = []; for (let i = 0; i <= 40; i++) { const t = (i / 40) * Math.PI; pts.push(pr([r * Math.cos(t) * Math.cos(pr.yaw), -r * Math.cos(t) * Math.sin(pr.yaw), r * Math.sin(t)]).p); }
    const c = pr([0, 0, 0]).p; g.arc(c, r, 0, 180, { w: "bold" });
    const pc = viewY(P(730, 540), 1, -30, 18); cylinder(g, pc, r, r);
    const tip = pc([0, 0, 0]).p, top0 = pc([-r * Math.cos(pc.yaw), r * Math.sin(pc.yaw), r]).p, top1 = pc([r * Math.cos(pc.yaw), -r * Math.sin(pc.yaw), r]).p;
    g.seg(tip, top0, { dash: true, w: "thin" }); g.seg(tip, top1, { dash: true, w: "thin" });
    txt(g, P(500, 660), "hemisphere = cylinder minus cone", { small: true });
  },
  surface(g) {
    const u = 130, o = P(240, 90), S = (x, y) => P(o.x + x * u, o.y + y * u);
    const cells = [[1, 0], [0, 1], [1, 1], [2, 1], [3, 1], [1, 2]];
    for (const [x, y] of cells) g.poly([S(x, y), S(x + 1, y), S(x + 1, y + 1), S(x, y + 1)], { w: "bold" });
    txt(g, P(500, 560), "a net of a cube: 6 faces", { small: true }); txt(g, P(500, 620), "SA = 6s\u00b2", { small: true });
  },
  silo(g) {
    const pc = viewY(P(500, 620), 1.1, -30, 15), r = 150, h = 280; cylinder(g, pc, r, h);
    const c = pc([0, 0, h]).p; g.arc(c, r * 1.0, 0, 180, { w: "bold" });
    txt(g, P(700, 450), "h", { italic: true }); txt(g, P(500, 80), "cylinder + hemisphere", { small: true });
  },
  simsolid(g) {
    const a = boxSolid(120, 120, 120), b = boxSolid(240, 240, 240);
    solid(g, a.v, a.f, view(P(250, 520), 1.2)); solid(g, b.v, b.f, view(P(680, 560), 1.2));
    txt(g, P(500, 660), "k = 2: area \u00d74, volume \u00d78", { small: true });
  },
  platonic(g) {
    const items = [["tetra", P(140, 230), 70], ["cube", P(500, 230), 70], ["octa", P(860, 230), 110], ["dodeca", P(300, 520), 70], ["icosa", P(700, 520), 85]];
    for (const [n, c, s] of items) drawPlato(g, n, c, s);
  },
  design(g) {
    const a = boxSolid(100, 100, 100), b = boxSolid(200, 200, 50);
    solid(g, a.v, a.f, view(P(250, 520), 1.6)); solid(g, b.v, b.f, view(P(700, 500), 1.6));
    txt(g, P(250, 640), "10 \u00d7 10 \u00d7 10: 600 cm\u00b2", { small: true }); txt(g, P(700, 640), "20 \u00d7 20 \u00d7 2.5: 1,000 cm\u00b2", { small: true });
  },
  spheretri(g) {
    const pr = viewY(P(500, 360), 1, -30, 20), r = 280; const c = P(500, 360);
    g.circle(c, r, { w: "bold" }); ring(g, pr, [0, 0, 0], r);
    const N = [0, 0, r], meridian = (lon, t0, t1) => { const pts = []; for (let i = 0; i <= 30; i++) { const t = t0 + (t1 - t0) * (i / 30); pts.push(pr([r * Math.cos(t) * Math.cos(lon), r * Math.cos(t) * Math.sin(lon), r * Math.sin(t)]).p); } return pts; };
    const L1 = -1.9, L2 = L1 + Math.PI / 2;
    g.poly(meridian(L1, 0, Math.PI / 2), { open: true, w: "bold" }); g.poly(meridian(L2, 0, Math.PI / 2), { open: true, w: "bold" });
    const eq = []; for (let i = 0; i <= 30; i++) { const t = L1 + (L2 - L1) * (i / 30); eq.push(pr([r * Math.cos(t), r * Math.sin(t), 0]).p); } g.poly(eq, { open: true, w: "bold" });
    g.dot(pr(N).p); txt(g, P(500, 680), "three right angles: 270 degrees", { small: true });
  }
};
