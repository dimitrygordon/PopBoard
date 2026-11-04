// Geometry course figures, Units 5 to 8. Each figure draws on a 1000 x 700 board with exact coordinates.
import { P, M, lab, txt, avg, shape, lineArrows, parMark, clipLine, grid } from "./geo-fig-kit.js";
import { gridSmall } from "./geo-figures-a.js";

const para = (A, B, D) => [A, B, M.add(B, M.sub(D, A)), D];
function kochPts(a, b, d) {
  if (d === 0) return [a, b];
  const p = M.lerp(a, b, 1 / 3), q = M.lerp(a, b, 2 / 3), t = M.rotate(q, p, 60);
  return [kochPts(a, p, d - 1), kochPts(p, t, d - 1), kochPts(t, q, d - 1), kochPts(q, b, d - 1)].flatMap((s, i) => (i ? s.slice(1) : s));
}
function pyTree(g, a, b, d, ang = 36.87) {
  // square on ab (outward to the left of a->b on screen), then a right triangle on its top side
  const v = M.sub(b, a), n = P(v.y, -v.x), c = M.add(b, n), e = M.add(a, n);
  g.poly([a, b, c, e]);
  if (d === 0) return;
  const top = M.add(e, M.mul(M.rotate(M.sub(c, e), P(0, 0), ang), Math.cos(ang * M.DEG)));
  pyTree(g, e, top, d - 1, ang); pyTree(g, top, c, d - 1, ang);
}
function boxGrid(g, x0, y0, cols, rows, u) {
  for (let i = 0; i <= cols; i++) g.seg(P(x0 + i * u, y0), P(x0 + i * u, y0 + rows * u), { w: "thin" });
  for (let j = 0; j <= rows; j++) g.seg(P(x0, y0 + j * u), P(x0 + cols * u, y0 + j * u), { w: "thin" });
}
const box = (x0, y0, x1, y1) => [P(x0, y0), P(x1, y0), P(x1, y1), P(x0, y1)];

export const FIGS = {
  parpost(g) {
    const Pp = P(500, 220);
    lineArrows(g, P(60, 520), P(940, 520)); lab(g, P(940, 520), "l", P(940, 0), { off: 26 });
    lineArrows(g, P(60, 220), P(940, 220), { w: "bold" });
    for (const d of [12, -12, 25]) { const q = M.polar(Pp, 480, d), r = M.polar(Pp, 480, 180 + d); g.seg(q, r, { dash: true, w: "thin" }); }
    g.dot(Pp); lab(g, Pp, "P", P(500, 320), { off: 22 });
    txt(g, P(500, 640), "exactly one line through P is parallel to l", { small: true });
  },
  anglesum(g) {
    const A = P(150, 560), C = P(850, 560), B = P(400, 180);
    shape(g, [A, B, C], ["A", "B", "C"], { w: "bold" }); lineArrows(g, P(60, 180), P(940, 180));
    parMark(g, P(600, 180), P(700, 180)); parMark(g, P(600, 560), P(700, 560));
    g.angle(P(60, 180), B, A, 1, 60); g.angle(A, B, C, 2, 46); g.angle(C, B, P(940, 180), 3, 60);
    g.angle(C, A, B, 1, 70); g.angle(B, C, A, 3, 60);
  },
  hl(g) {
    for (const [o, s] of [[P(90, 560), 1], [P(560, 560), 1]]) {
      const A = o, B = P(o.x + 330, o.y), C = P(o.x, o.y - 380 * s);
      shape(g, [A, B, C], null, { w: "bold" }); g.right(B, A, C); g.ticks(B, C, 2); g.ticks(A, C, 1);
    }
    txt(g, P(500, 650), "hypotenuse and leg: HL (right triangles only)", { small: true });
  },
  slopes(g) {
    const S = grid(g, P(500, 620), 55, [-7, 7], [-1, 10], { nums: false });
    const p0 = S(-3, 4), p1 = S(3, 8), q0 = S(1, 9), q1 = S(5, 3);
    g.seg(M.lerp(p0, p1, -0.6), M.lerp(p0, p1, 1.4), { w: "bold" }); g.seg(M.lerp(q0, q1, -0.15), M.lerp(q0, q1, 1.3), { w: "bold" });
    g.seg(S(-3, 4), S(3, 4), { dash: true, w: "thin" }); g.seg(S(3, 4), S(3, 8), { dash: true, w: "thin" });
    txt(g, S(0, 3.5), "run 6", { small: true }); txt(g, S(3.9, 6), "rise 4", { small: true });
    txt(g, S(-4.6, 9.3), "slope 2/3", { small: true }); txt(g, S(5.4, 1.6), "slope \u22123/2", { small: true });
  },
  lineeq(g) {
    const S = grid(g, P(280, 470), 50, [-2, 12], [-6, 8], { nums: true });
    const box = [S(-2, 8), S(12, -6)];
    const L = (m, b) => { const c = clipLine(S(0, b), S(1, m + b), box[0].x, box[0].y, box[1].x, box[1].y); if (c) g.seg(c[0], c[1], { w: "bold" }); };
    L(3, -1); L(3, -11); L(-1 / 3, 7 / 3);
    g.dot(S(4, 1), 7); g.label(S(4, 1), "(4, 1)", { dir: P(1, 0.3), italic: false, small: true, off: 16 });
    txt(g, S(3.2, 7.3), "y = 3x \u2212 1", { small: true, anchor: "end" }); txt(g, S(6.2, 6.6), "y = 3x \u2212 11", { small: true, anchor: "start" });
  },
  proofpar(g) {
    const [A, B, C, D] = para(P(160, 520), P(620, 520), P(340, 180));
    shape(g, [A, B, C, D], ["A", "B", "C", "D"], { w: "bold" }); g.seg(A, C);
    parMark(g, A, B); parMark(g, D, C); g.ticks(M.lerp(A, B, 0.25), M.lerp(A, B, 0.35), 1); g.ticks(M.lerp(D, C, 0.25), M.lerp(D, C, 0.35), 1);
    g.angle(B, A, C, 1, 80); g.angle(D, C, A, 1, 80);
  },
  quadtree(g) {
    const nodes = { q: [500, 70, "quadrilateral"], t: [300, 210, "trapezoid"], k: [740, 210, "kite"], p: [300, 350, "parallelogram"], r: [200, 490, "rectangle"], h: [560, 490, "rhombus"], s: [380, 630, "square"] };
    const edges = [["q", "t"], ["q", "k"], ["t", "p"], ["p", "r"], ["p", "h"], ["k", "h"], ["r", "s"], ["h", "s"]];
    for (const [a, b] of edges) g.seg(P(nodes[a][0], nodes[a][1] + 26), P(nodes[b][0], nodes[b][1] - 26));
    for (const [x, y, s] of Object.values(nodes)) { const w = s.length * 15 + 40; g.poly(box(x - w / 2, y - 26, x + w / 2, y + 26), { fill: "paper" }); txt(g, P(x, y), s, { small: true }); }
  },
  parallelogram(g) {
    const [A, B, C, D] = para(P(150, 540), P(650, 540), P(330, 170));
    shape(g, [A, B, C, D], ["A", "B", "C", "D"], { w: "bold" }); g.seg(A, C, { dash: true, w: "thin" });
    g.ticks(A, B, 1); g.ticks(D, C, 1); g.ticks(B, C, 2); g.ticks(A, D, 2); g.angle(B, A, D, 1, 50); g.angle(D, C, B, 1, 50); g.angle(C, B, A, 2, 50); g.angle(A, D, C, 2, 50);
  },
  diagonals(g) {
    const [A, B, C, D] = para(P(150, 540), P(650, 540), P(330, 170)), Mm = M.mid(A, C);
    shape(g, [A, B, C, D], ["A", "B", "C", "D"], { w: "bold" }); g.seg(A, C); g.seg(B, D);
    g.ticks(A, Mm, 1); g.ticks(Mm, C, 1); g.ticks(B, Mm, 2); g.ticks(Mm, D, 2); g.dot(Mm); lab(g, Mm, "M", P(Mm.x, 0));
  },
  provepara(g) {
    const [A, B, C, D] = para(P(150, 540), P(650, 540), P(330, 170));
    shape(g, [A, B, C, D], ["A", "B", "C", "D"], { w: "bold" }); parMark(g, A, B); parMark(g, D, C); g.ticks(M.lerp(A, B, 0.2), M.lerp(A, B, 0.3), 1); g.ticks(M.lerp(D, C, 0.2), M.lerp(D, C, 0.3), 1);
    txt(g, P(500, 650), "one pair both equal and parallel", { small: true });
  },
  special(g) {
    const R = box(70, 200, 450, 480); shape(g, R, null, { w: "bold" }); g.seg(R[0], R[2]); g.seg(R[1], R[3]); g.ticks(R[0], M.mid(R[0], R[2]), 1); g.ticks(M.mid(R[0], R[2]), R[2], 1); g.ticks(R[1], M.mid(R[1], R[3]), 1); g.ticks(M.mid(R[1], R[3]), R[3], 1);
    for (let i = 0; i < 4; i++) g.right(R[(i + 3) % 4], R[i], R[(i + 1) % 4]);
    const c = P(740, 340), H = [P(740, 120), P(900, 340), P(740, 560), P(580, 340)]; shape(g, H, null, { w: "bold" }); g.seg(H[0], H[2]); g.seg(H[1], H[3]); g.right(H[1], c, H[0]);
    for (let i = 0; i < 4; i++) g.ticks(H[i], H[(i + 1) % 4], 1);
    txt(g, P(260, 560), "rectangle: equal diagonals", { small: true }); txt(g, P(740, 640), "rhombus: perpendicular", { small: true });
  },
  trapkite(g) {
    const T = [P(60, 520), P(460, 520), P(370, 240), P(150, 240)];
    shape(g, T, null, { w: "bold" }); g.seg(T[0], T[2], { w: "thin" }); g.seg(T[1], T[3], { w: "thin" }); g.ticks(T[1], T[2], 1); g.ticks(T[3], T[0], 1);
    parMark(g, T[0], T[1]); parMark(g, T[3], T[2]); g.angle(T[1], T[0], T[3], 1, 50); g.angle(T[2], T[1], T[0], 1, 50);
    const K = [P(740, 120), P(890, 300), P(740, 600), P(590, 300)], X = P(740, 300);
    shape(g, K, null, { w: "bold" }); g.seg(K[0], K[2], { w: "thin" }); g.seg(K[1], K[3], { w: "thin" }); g.right(K[1], X, K[0]);
    g.ticks(K[0], K[1], 1); g.ticks(K[0], K[3], 1); g.ticks(K[2], K[1], 2); g.ticks(K[2], K[3], 2);
  },
  midseg(g) {
    const A = P(330, 100), B = P(120, 580), C = P(820, 580), Mm = M.mid(A, B), N = M.mid(A, C), Pp = M.add(N, M.sub(N, Mm));
    shape(g, [A, B, C], ["A", "B", "C"], { w: "bold" }); g.seg(Mm, N, { w: "bold" }); g.seg(N, Pp, { dash: true, w: "thin" }); g.seg(C, Pp, { dash: true, w: "thin" });
    g.ticks(A, Mm, 1); g.ticks(Mm, B, 1); g.ticks(A, N, 2); g.ticks(N, C, 2); parMark(g, Mm, N); parMark(g, B, C);
    lab(g, Mm, "M", P(900, Mm.y)); lab(g, N, "N", P(N.x - 60, N.y + 80)); lab(g, Pp, "P", P(Pp.x - 50, Pp.y + 40));
  },
  coordpara(g) {
    const S = gridSmall(g), V = [S(1, 1), S(5, 2), S(7, 6), S(3, 5)], Mm = S(4, 3.5);
    shape(g, V, null, { w: "bold" }); g.seg(V[0], V[2]); g.seg(V[1], V[3]); g.dot(Mm, 7);
    [["(1, 1)", P(-1, 1)], ["(5, 2)", P(1, 1)], ["(7, 6)", P(1, -1)], ["(3, 5)", P(-1, -1)]].forEach(([s, d], i) => g.label(V[i], s, { dir: d, italic: false, small: true, off: 14 }));
    g.label(Mm, "(4, 3.5)", { dir: P(1, 0.1), italic: false, small: true, off: 22 });
  },
  polysum(g) {
    const H = M.regular(P(500, 360), 290, 6, 90);
    g.poly(H, { w: "bold" }); for (let i = 2; i <= 4; i++) g.seg(H[0], H[i], { dash: true, w: "thin" });
    [1, 2, 3, 4].forEach((n, i) => txt(g, avg([H[0], H[i + 1], H[i + 2]]), String(n), { small: true }));
    txt(g, P(500, 680), "6 sides, 4 triangles: (6 \u2212 2)(180) = 720", { small: true });
  },
  stars(g) {
    const c1 = P(270, 330), Pn = M.regular(c1, 220, 5, 90);
    g.poly(Pn, { w: "bold" }); g.poly([0, 2, 4, 1, 3].map((i) => Pn[i])); g.angle(Pn[4], Pn[0], Pn[1], 1, 40);
    txt(g, P(270, 610), "{5/2} in a pentagon", { small: true });
    const c2 = P(740, 330), H = M.regular(c2, 220, 7, 90);
    g.poly(H, { w: "thin" }); g.poly([0, 3, 6, 2, 5, 1, 4].map((i) => H[i]), { w: "bold" });
    txt(g, P(740, 610), "{7/3}", { small: true });
  },
  tangram(g) {
    const u = 140, o = P(220, 70), S = (x, y) => P(o.x + x * u, o.y + y * u);
    const pieces = [[[0, 0], [4, 0], [2, 2]], [[0, 0], [2, 2], [0, 4]], [[4, 2], [4, 4], [2, 4]], [[2, 2], [3, 1], [3, 3]], [[0, 4], [1, 3], [2, 4]], [[2, 2], [3, 3], [2, 4], [1, 3]], [[3, 1], [4, 0], [4, 2], [3, 3]]];
    for (const p of pieces) g.poly(p.map(([x, y]) => S(x, y)), { w: "bold" });
  },
  rectarea(g) {
    const u = 100, x0 = 250, y0 = 170;
    boxGrid(g, x0, y0, 5, 3, u); g.poly(box(x0, y0, x0 + 5 * u, y0 + 3 * u), { w: "bold" });
    txt(g, P(x0 + 2.5 * u, y0 + 3 * u + 40), "b = 5"); txt(g, P(x0 - 60, y0 + 1.5 * u), "h = 3"); txt(g, P(500, 630), "A = bh = 15 square units", { small: true });
  },
  triarea(g) {
    const A = P(120, 560), B = P(720, 560), C = P(470, 160), F = P(470, 560);
    g.poly(box(120, 160, 720, 560), { dash: true, w: "thin" }); shape(g, [A, B, C], ["A", "B", "C"], { w: "bold" });
    g.seg(C, F, { dash: true }); g.right(B, F, C); txt(g, P(500, 360), "h", { italic: true }); txt(g, P(420, 610), "b", { italic: true });
    txt(g, P(860, 360), "A = (1/2)bh", { small: true });
  },
  paraarea(g) {
    const Pa = para(P(60, 540), P(400, 540), P(170, 260)), F = P(170, 540);
    shape(g, Pa, null, { w: "bold" }); g.seg(Pa[3], F, { dash: true }); g.right(Pa[1], F, Pa[3]); txt(g, P(230, 590), "b", { italic: true }); txt(g, P(150, 400), "h", { italic: true });
    const T = [P(540, 540), P(940, 540), P(840, 260), P(640, 260)], F2 = P(640, 540);
    shape(g, T, null, { w: "bold" }); g.seg(T[3], F2, { dash: true }); g.right(T[1], F2, T[3]); parMark(g, T[0], T[1]); parMark(g, T[3], T[2]);
    txt(g, P(740, 590), "b\u2081", { italic: true }); txt(g, P(740, 225), "b\u2082", { italic: true }); txt(g, P(620, 400), "h", { italic: true });
  },
  composite(g) {
    const u = 70, o = P(250, 110), S = (x, y) => P(o.x + x * u, o.y + y * u);
    g.poly([S(0, 0), S(3, 0), S(3, 4), S(7, 4), S(7, 7), S(0, 7)], { w: "bold" }); g.seg(S(3, 4), S(0, 4), { dash: true, w: "thin" });
    txt(g, S(1.5, -0.5), "3", { small: true }); txt(g, S(-0.5, 3.5), "7", { small: true }); txt(g, S(3.5, 7.5), "7", { small: true }); txt(g, S(7.5, 5.5), "3", { small: true });
    txt(g, S(1.5, 2), "12", { small: true }); txt(g, S(3.5, 5.5), "21", { small: true });
  },
  pythag(g) {
    const a = 3, b = 4, u = 80, x0 = 220, y0 = 70, s = (a + b) * u, S = (x, y) => P(x0 + x * u, y0 + y * u);
    g.poly(box(x0, y0, x0 + s, y0 + s), { w: "bold" });
    const I = [S(a, 0), S(a + b, a), S(b, a + b), S(0, b)]; g.poly(I, { w: "bold" });
    txt(g, S(a / 2, -0.4), "a", { italic: true }); txt(g, S(a + b / 2, -0.4), "b", { italic: true }); txt(g, avg(I), "c\u00b2", { italic: true });
    txt(g, M.add(M.mid(I[0], I[1]), P(-25, 25)), "c", { italic: true });
  },
  pytree(g) { pyTree(g, P(430, 660), P(550, 660), 5); txt(g, P(820, 640), "3-4-5 triangles", { small: true }); },
  distance(g) {
    const S = gridSmall(g), A = S(1, 1), B = S(5, 4), C = S(5, 1);
    g.seg(A, C, { dash: true }); g.seg(C, B, { dash: true }); g.right(A, C, B); g.seg(A, B, { w: "bold" });
    g.dot(A, 7); g.dot(B, 7); g.label(A, "(1, 1)", { dir: P(-1, 1), italic: false, small: true }); g.label(B, "(5, 4)", { dir: P(1, -1), italic: false, small: true });
    txt(g, S(3, 0.5), "4", { small: true }); txt(g, S(5.4, 2.5), "3", { small: true }); txt(g, S(2.6, 3), "d = 5", { small: true });
  },
  coordarea(g) {
    const S = gridSmall(g), V = [S(1, 2), S(6, 1), S(7, 5), S(3, 7)];
    g.poly([S(1, 1), S(7, 1), S(7, 7), S(1, 7)], { dash: true, w: "thin" }); shape(g, V, null, { w: "bold" });
    txt(g, S(4, 8.4), "rectangle 36 minus four corner triangles", { small: true });
  },
  coordsquare(g) {
    const S = gridSmall(g), V = [S(1, 2), S(4, 1), S(5, 4), S(2, 5)];
    shape(g, V, null, { w: "bold" }); for (let i = 0; i < 4; i++) { g.ticks(V[i], V[(i + 1) % 4], 1); } g.right(V[3], V[0], V[1]);
    [["(1, 2)", P(-1, 0)], ["(4, 1)", P(1, 1)], ["(5, 4)", P(1, 0)], ["(2, 5)", P(-1, -1)]].forEach(([s, d], i) => g.label(V[i], s, { dir: d, italic: false, small: true }));
  },
  coordgeneral(g) {
    const o = P(220, 560), A = P(760, 560), B = P(760, 200), C = P(220, 200);
    lineArrows(g, P(140, 560), P(900, 560)); lineArrows(g, P(220, 640), P(220, 100));
    shape(g, [o, A, B, C], null, { w: "bold" }); g.seg(o, B); g.seg(A, C);
    [[o, "O(0, 0)", P(-1, 1)], [A, "A(a, 0)", P(1, 1)], [B, "B(a, b)", P(1, -1)], [C, "C(0, b)", P(-1, -1)]].forEach(([p, s, d]) => g.label(p, s, { dir: d, italic: false, small: true }));
  },
  ratio(g) {
    const u = 120, a = P(200, 250), c = P(200, 450);
    g.seg(a, M.add(a, P(2 * u, 0)), { w: "bold" }); g.seg(c, M.add(c, P(3 * u, 0)), { w: "bold" });
    for (let i = 0; i <= 2; i++) g.seg(M.add(a, P(i * u, -12)), M.add(a, P(i * u, 12))); for (let i = 0; i <= 3; i++) g.seg(M.add(c, P(i * u, -12)), M.add(c, P(i * u, 12)));
    lab(g, a, "A", P(1000, a.y)); lab(g, M.add(a, P(2 * u, 0)), "B", P(0, a.y)); lab(g, c, "C", P(1000, c.y)); lab(g, M.add(c, P(3 * u, 0)), "D", P(0, c.y));
    txt(g, P(500, 620), "AB : CD = 2 : 3", { small: true });
  },
  dilation(g) {
    const O = P(110, 600), T = [P(300, 480), P(420, 520), P(330, 360)], Ti = T.map((p) => M.dilate(p, O, 2));
    for (const p of Ti) g.seg(O, M.lerp(O, p, 1.08), { dash: true, w: "thin" });
    shape(g, T, ["A", "B", "C"], { w: "bold" }); shape(g, Ti, ["A\u2032", "B\u2032", "C\u2032"], { w: "bold" }); g.dot(O); lab(g, O, "O", P(300, 300));
    txt(g, P(780, 650), "k = 2: OA\u2032 = 2 OA", { small: true });
  },
  dilprops(g) {
    const O = P(160, 420), A = P(330, 230), B = P(420, 470), k = 2, A2 = M.dilate(A, O, k), B2 = M.dilate(B, O, k);
    g.seg(O, A2, { dash: true, w: "thin" }); g.seg(O, B2, { dash: true, w: "thin" });
    g.seg(A, B, { w: "bold" }); g.seg(A2, B2, { w: "bold" }); parMark(g, A, B); parMark(g, A2, B2);
    const L0 = P(60, 600), L1 = P(940, 160 + 0); const through = [M.lerp(O, P(900, 640), -0.1), P(900, 640)]; g.seg(through[0], through[1]);
    g.dot(O); for (const [p, n] of [[O, "O"], [A, "A"], [B, "B"], [A2, "A\u2032"], [B2, "B\u2032"]]) lab(g, p, n, P(p.x + 40, p.y + 70));
    txt(g, P(700, 670), "a line through O maps to itself", { small: true });
  },
  similar(g) {
    const T = [P(80, 560), P(360, 560), P(150, 340)], Ti = T.map((p) => M.add(M.rotate(M.dilate(p, P(80, 560), 1.6), P(80, 560), 20), P(470, 60)));
    for (const [tt, nm] of [[T, ["A", "B", "C"]], [Ti, ["D", "E", "F"]]]) { shape(g, tt, nm, { w: "bold" }); g.angle(tt[1], tt[0], tt[2], 1, 44); g.angle(tt[0], tt[1], tt[2], 2, 44); g.angle(tt[0], tt[2], tt[1], 3, 40); }
  },
  simpoly(g) {
    const Q = [P(80, 560), P(330, 560), P(300, 400), P(140, 360)], Qi = Q.map((p) => M.add(M.dilate(p, P(80, 560), 1.6), P(450, 30)));
    shape(g, Q, ["A", "B", "C", "D"], { w: "bold" }); shape(g, Qi, ["W", "X", "Y", "Z"], { w: "bold" });
    txt(g, P(500, 670), "ABCD ~ WXYZ, k = 1.6", { small: true });
  },
  sidesplit(g) {
    const A = P(380, 90), B = P(110, 600), C = P(860, 600), t = 0.4, D = M.lerp(A, B, t), E = M.lerp(A, C, t);
    shape(g, [A, B, C], ["A", "B", "C"], { w: "bold" }); g.seg(D, E, { w: "bold" }); parMark(g, D, E); parMark(g, B, C);
    lab(g, D, "D", P(900, D.y)); lab(g, E, "E", P(0, E.y));
    txt(g, P(500, 670), "AD/DB = AE/EC", { small: true });
  },
  partition(g) {
    const S = gridSmall(g), A = S(1, 2), B = S(6, 7), Pp = M.lerp(A, B, 2 / 5);
    g.seg(A, B, { w: "bold" }); for (let i = 1; i < 5; i++) g.ticks(M.lerp(A, B, i / 5 - 0.01), M.lerp(A, B, i / 5 + 0.01), 1);
    g.dot(A, 7); g.dot(B, 7); g.dot(Pp, 7);
    g.label(A, "A(1, 2)", { dir: P(1, 1), italic: false, small: true }); g.label(B, "B(6, 7)", { dir: P(1, -1), italic: false, small: true }); g.label(Pp, "P(3, 4)", { dir: P(-1, -1), italic: false, small: true });
  },
  aa(g) {
    const T = [P(80, 560), P(400, 560), P(170, 300)], Ti = T.map((p) => M.add(M.dilate(p, P(80, 560), 1.35), P(470, 0)));
    for (const [tt, nm] of [[T, ["A", "B", "C"]], [Ti, ["D", "E", "F"]]]) { shape(g, tt, nm, { w: "bold" }); g.angle(tt[1], tt[0], tt[2], 1, 44); g.angle(tt[0], tt[1], tt[2], 2, 44); }
  },
  sassss(g) {
    const u = 45, A = P(80, 560), T = [A, M.add(A, P(4 * u, 0)), M.polar(A, 3 * u, 70)], B = P(450, 560), Ti = [B, M.add(B, P(8 * u, 0)), M.polar(B, 6 * u, 70)];
    for (const tt of [T, Ti]) { shape(g, tt, null, { w: "bold" }); g.angle(tt[1], tt[0], tt[2], 1, 40); }
    txt(g, P(260, 600), "4", { small: true }); txt(g, P(60, 470), "3", { small: true }); txt(g, P(630, 600), "8", { small: true }); txt(g, P(460, 360), "6", { small: true });
    txt(g, P(500, 660), "SAS similarity: 3/6 = 4/8, angle equal", { small: true });
  },
  anglebis(g) {
    const A = P(330, 110), B = P(100, 580), C = P(880, 580), b = M.dist(A, C), c = M.dist(A, B), D = M.lerp(B, C, c / (b + c));
    shape(g, [A, B, C], ["A", "B", "C"], { w: "bold" }); g.seg(A, D); g.angle(B, A, D, 1, 60); g.angle(D, A, C, 1, 70); g.dot(D); lab(g, D, "D", A);
    txt(g, P(500, 660), "BD/DC = AB/AC", { small: true });
  },
  simarea(g) {
    const u = 80;
    g.poly(box(120, 300, 120 + u, 300 + u), { w: "bold" }); txt(g, P(160, 420), "1", { small: true });
    boxGrid(g, 420, 140, 3, 3, 2 * u - 20); g.poly(box(420, 140, 420 + 3 * (2 * u - 20), 140 + 3 * (2 * u - 20)), { w: "bold" });
    txt(g, P(630, 610), "k = 3: area 9", { small: true });
  },
  kochstage(g) {
    for (let d = 0; d < 4; d++) { const x = 70 + (d % 2) * 470, y = 300 + Math.floor(d / 2) * 300; g.poly(kochPts(P(x, y), P(x + 400, y), d), { open: true }); txt(g, P(x + 200, y + 40), `stage ${d}: length ${["1", "4/3", "16/9", "64/27"][d]}`, { small: true }); }
  },
  shadow(g) {
    const ground = 600;
    g.seg(P(40, ground), P(960, ground), { w: "bold" });
    g.seg(P(150, ground), P(150, 470), { w: "bold" }); g.circle(P(150, 450), 20); const s1 = P(250, ground);
    const bx = 560, bh = 450; g.poly(box(bx, ground - bh, bx + 120, ground), { w: "bold" });
    const s2 = P(bx + 120 + (bh * 100) / 150, ground);
    g.seg(P(150, 430), s1, { dash: true, w: "thin" }); g.seg(P(bx + 120, ground - bh), s2, { dash: true, w: "thin" });
    g.angle(P(150, 430), s1, P(40, ground), 1, 40); g.angle(P(bx + 120, ground - bh), s2, P(bx, ground), 1, 40);
    txt(g, P(200, 640), "shadow", { small: true }); txt(g, P((bx + 120 + s2.x) / 2, 640), "shadow", { small: true });
  }
};
export { kochPts, pyTree };
