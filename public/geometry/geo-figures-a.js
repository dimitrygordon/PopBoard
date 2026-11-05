// Geometry course figures, Units 1 to 4. Each figure draws on a 1000 x 700 board with exact coordinates.
import { P, M, lab, txt, avg, shape, lineArrows, parMark } from "./geo-fig-kit.js";

function sierp(g, a, b, c, d) {
  if (d === 0) { g.poly([a, b, c]); return; }
  const ab = M.mid(a, b), bc = M.mid(b, c), ca = M.mid(c, a);
  sierp(g, a, ab, ca, d - 1); sierp(g, ab, b, bc, d - 1); sierp(g, ca, bc, c, d - 1);
}
// perpendicular bisector construction of ab (arcs radius r), returns [p, q, m]
function perpBis(g, a, b, r, names = ["P", "Q"]) {
  const [p, q] = M.circleX(a, r, b, r), top = p.y < q.y ? p : q, bot = p.y < q.y ? q : p;
  for (const [c, o] of [[a, b], [b, a]]) {
    const d0 = M.dirDeg(c, top), d1 = M.dirDeg(c, bot);
    g.arc(c, r, d0 - 12, d0 + 12, { w: "thin" }); g.arc(c, r, d1 - 12, d1 + 12, { w: "thin" });
  }
  g.seg(M.lerp(top, bot, -0.15), M.lerp(top, bot, 1.15));
  const m = M.mid(a, b);
  if (names) { lab(g, top, names[0], m); lab(g, bot, names[1], m); }
  return [top, bot, m];
}
function transversalFig(g, parallel) {
  const L1 = [P(80, 230), P(920, 230)], L2 = parallel ? [P(80, 480), P(920, 480)] : [P(80, 440), P(920, 540)];
  const T = [P(330, 660), P(700, 50)];
  lineArrows(g, ...L1); lineArrows(g, ...L2); lineArrows(g, ...T);
  if (parallel) { parMark(g, P(120, 230), P(260, 230)); parMark(g, P(120, 480), P(260, 480)); }
  const X1 = M.lineX(...L1, ...T), X2 = M.lineX(...L2, ...T);
  let n = 1;
  for (const X of [X1, X2]) {
    const L = X === X1 ? L1 : L2, u = M.unit(M.sub(L[1], L[0])), v = M.unit(M.sub(T[1], T[0]));
    // the four angles at X in the order: upper right, upper left, lower left, lower right
    for (const [s, t] of [[1, 1], [-1, 1], [-1, -1], [1, -1]]) {
      const d = M.unit(M.add(M.mul(u, s), M.mul(v, t)));
      lab(g, M.add(X, M.mul(d, 44)), String(n++), X, { off: 0, italic: false, small: true });
    }
    g.dot(X);
  }
  lab(g, L1[1], "l", P(L1[1].x, 0), { off: 30 }); lab(g, L2[1], "m", P(L2[1].x, 0), { off: 30 }); lab(g, T[1], "t", P(T[1].x - 100, T[1].y), { off: 26 });
}

export const FIGS = {
  illusion(g) {
    const y1 = 230, y2 = 480, a = 280, b = 720;
    g.seg(P(a, y1), P(b, y1), { w: "bold" });
    for (const [x, s] of [[a, -1], [b, 1]]) { g.seg(P(x, y1), P(x + s * 70, y1 - 60)); g.seg(P(x, y1), P(x + s * 70, y1 + 60)); }
    g.seg(P(a, y2), P(b, y2), { w: "bold" });
    for (const [x, s] of [[a, 1], [b, -1]]) { g.seg(P(x, y2), P(x + s * 70, y2 - 60)); g.seg(P(x, y2), P(x + s * 70, y2 + 60)); }
    txt(g, P(500, 80), "Which segment is longer?");
    txt(g, P(500, 640), "Measure: both are the same length.", { small: true });
  },
  chords(g) {
    const c = P(500, 340), r = 270, pts = [96, 160, 228, 300, 20].map((d) => M.polar(c, r, d));
    g.circle(c, r);
    for (let i = 0; i < pts.length; i++) for (let j = i + 1; j < pts.length; j++) g.seg(pts[i], pts[j]);
    pts.forEach((p) => g.dot(p, 6));
    txt(g, P(500, 670), "5 points, 16 regions", { small: true });
  },
  city(g) {
    g.dot(P(170, 170), 6); lab(g, P(170, 170), "A", P(170, 260));
    txt(g, P(170, 270), "point A", { small: true });
    const a = P(60, 560), b = P(470, 380), B = M.lerp(a, b, 0.3), C = M.lerp(a, b, 0.72);
    lineArrows(g, a, b); g.dot(B, 6); g.dot(C, 6); lab(g, B, "B", P(B.x + 30, B.y + 60)); lab(g, C, "C", P(C.x + 30, C.y + 60));
    txt(g, P(300, 610), "line BC", { small: true });
    const pl = [P(570, 170), P(950, 170), P(880, 450), P(500, 450)];
    g.poly(pl); txt(g, P(850, 410), "plane R", { small: true });
    for (const [p, n] of [[P(640, 260), "D"], [P(800, 240), "E"], [P(700, 370), "F"]]) { g.dot(p, 6); lab(g, p, n, P(p.x, p.y + 40)); }
  },
  eratosthenes(g) {
    const c = P(430, 470), r = 330, S = M.polar(c, r, 90), A = M.polar(c, r, 115);
    g.arc(c, r, 40, 170);
    g.seg(c, S, { dash: true, w: "thin" }); g.seg(c, A, { dash: true, w: "thin" });
    const stick = M.polar(c, r + 80, 115);
    g.seg(A, stick, { w: "bold" });
    for (const p of [S, A]) { g.seg(P(p.x, 40), p); g.arrow(P(p.x, 40), M.lerp(P(p.x, 40), p, 0.5)); }
    g.seg(stick, P(stick.x + (A.x - stick.x), A.y), { w: "thin", dash: true });
    g.angle(S, c, A, 1, 80); g.angle(P(A.x, A.y - 100), A, stick, 1, 60);
    g.dot(c); g.dot(S); g.dot(A);
    txt(g, P(S.x + 20, S.y + 30), "Syene", { anchor: "start", small: true });
    txt(g, P(A.x - 30, A.y + 34), "Alexandria", { anchor: "end", small: true });
    txt(g, P(690, 70), "parallel sunlight", { small: true });
    txt(g, P(760, 640), "angle exaggerated (really 7.2 degrees)", { small: true });
  },
  sierpinski(g) { sierp(g, P(500, 50), P(880, 660), P(120, 660), 4); },
  euclid1(g) {
    const A = P(390, 470), B = P(610, 470), r = 220, [p, q] = M.circleX(A, r, B, r), C = p.y < q.y ? p : q;
    g.circle(A, r, { w: "thin" }); g.circle(B, r, { w: "thin" });
    shape(g, [A, B, C], ["A", "B", "C"], { w: "bold" });
    [A, B, C].forEach((x) => g.dot(x));
  },
  undefined(g) {
    const c = P(500, 350), words = ["point", "location", "place", "position"], R = 220;
    const at = words.map((_, i) => M.polar(c, R, 90 - i * 90));
    words.forEach((w, i) => txt(g, at[i], w));
    for (let i = 0; i < 4; i++) {
      const a0 = 90 - i * 90 - 28, a1 = 90 - (i + 1) * 90 + 28, p = M.polar(c, R, a1), q = M.polar(c, R, a1 + 4);
      g.arc(c, R, a1, a0); g.arrow(q, p);
    }
    txt(g, P(500, 660), "Some words must stay undefined.", { small: true });
  },
  conditional(g) {
    g.circle(P(480, 340), 290); g.circle(P(560, 390), 130);
    txt(g, P(330, 210), "rectangles"); txt(g, P(560, 390), "squares");
    txt(g, P(500, 670), "If it is a square, then it is a rectangle.", { small: true });
  },
  kite(g) {
    const A = P(500, 80), B = P(720, 290), C = P(500, 630), D = P(280, 290), X = P(500, 290);
    shape(g, [A, B, C, D], ["A", "B", "C", "D"], { w: "bold" });
    g.ticks(A, B, 1); g.ticks(A, D, 1); g.ticks(C, B, 2); g.ticks(C, D, 2);
    g.seg(A, C, { dash: true, w: "thin" }); g.seg(B, D, { dash: true, w: "thin" }); g.right(B, X, A);
  },
  twocolumn(g) {
    const x0 = 120, x1 = 880, xm = 520, y0 = 110;
    g.seg(P(x0, y0 + 60), P(x1, y0 + 60)); g.seg(P(xm, y0), P(xm, 640));
    txt(g, P((x0 + xm) / 2, y0 + 25), "Statements", { bold: true }); txt(g, P((xm + x1) / 2, y0 + 25), "Reasons", { bold: true });
    ["1.", "2.", "3.", "4."].forEach((n, i) => { const y = y0 + 130 + i * 120; txt(g, P(x0 + 10, y), n, { anchor: "start", small: true }); g.seg(P(x0 + 60, y + 20), P(xm - 30, y + 20), { w: "thin" }); g.seg(P(xm + 30, y + 20), P(x1 - 10, y + 20), { w: "thin" }); });
  },
  indirect(g) {
    const Pp = P(330, 360), Q = P(670, 360);
    lineArrows(g, P(80, 360), P(920, 360)); lab(g, P(920, 360), "l", P(920, 300), { off: 24 });
    g.path(`M100 520 C 260 520 ${Pp.x - 60} ${Pp.y + 40} ${Pp.x} ${Pp.y} S 460 200 500 200 S ${Q.x - 60} ${Q.y - 50} ${Q.x} ${Q.y} S 760 520 900 520`, { dash: true });
    g.dot(Pp); g.dot(Q); lab(g, Pp, "P", P(Pp.x + 30, 460)); lab(g, Q, "Q", P(Q.x - 30, 460));
    txt(g, P(500, 640), "Two lines through P and Q would be the same line.", { small: true });
  },
  deductive(g) {
    const rows = ["theorems", "postulates", "definitions", "undefined terms"];
    rows.forEach((r, i) => { const w = 340 + i * 120, y = 90 + i * 150; g.poly([P(500 - w / 2, y), P(500 + w / 2, y), P(500 + w / 2, y + 90), P(500 - w / 2, y + 90)]); txt(g, P(500, y + 45), r); if (i) { g.seg(P(500, y), P(500, y - 60)); g.arrow(P(500, y), P(500, y - 60)); } });
  },
  algebra(g) {
    const c = P(500, 600);
    g.poly([P(460, 640), P(540, 640), c]); g.seg(P(500, 600), P(500, 260), { w: "bold" });
    g.seg(P(200, 260), P(800, 260), { w: "bold" });
    for (const [x, s] of [[230, "2x + 3"], [770, "11"]]) { g.seg(P(x, 260), P(x - 110, 420)); g.seg(P(x, 260), P(x + 110, 420)); g.arc(P(x, 420), 120, 180, 360); txt(g, P(x, 480), s); }
    txt(g, P(500, 120), "Do the same to both sides and it stays balanced.", { small: true });
  },
  ruler(g) {
    const o = P(110, 380), u = 78;
    g.seg(P(60, 380), P(940, 380)); g.arrow(P(60, 380), P(940, 380)); g.arrow(P(940, 380), P(60, 380));
    for (let i = 0; i <= 10; i++) { const x = o.x + i * u; g.seg(P(x, 365), P(x, 395)); txt(g, P(x, 430), String(i), { small: true }); }
    const A = P(o.x + 2 * u, 380), B = P(o.x + 9 * u, 380);
    g.dot(A, 7); g.dot(B, 7); lab(g, A, "A", P(A.x, 500)); lab(g, B, "B", P(B.x, 500));
    g.seg(P(A.x, 250), P(B.x, 250), { w: "thin" }); g.arrow(P(B.x, 250), P(A.x, 250)); g.arrow(P(A.x, 250), P(B.x, 250));
    txt(g, P((A.x + B.x) / 2, 200), "AB = |9 \u2212 2| = 7");
  },
  midpoint(g) {
    const S = gridSmall(g), A = S(1, 2), B = S(7, 6), Mm = S(4, 4);
    g.seg(A, B, { w: "bold" }); g.ticks(A, Mm, 1); g.ticks(Mm, B, 1);
    for (const [p, s, d] of [[A, "A(1, 2)", P(0, 1)], [B, "B(7, 6)", P(0, -1)], [Mm, "M(4, 4)", P(-1, -1)]]) { g.dot(p, 7); g.label(p, s, { dir: d, italic: false, small: true, off: 20 }); }
  },
  protractor(g) {
    const c = P(500, 590), r = 380;
    g.arc(c, r, 0, 180); g.seg(P(c.x - r, c.y), P(c.x + r, c.y));
    for (let d = 0; d <= 180; d += 10) { const L = d % 30 === 0 ? 30 : 14; g.seg(M.polar(c, r, d), M.polar(c, r - L, d), { w: "thin" }); if (d % 30 === 0) txt(g, M.polar(c, r - 60, d), String(180 - d), { small: true }); }
    const a = M.polar(c, r + 40, 150), b = M.polar(c, r + 40, 70);
    g.seg(c, a, { w: "bold" }); g.seg(c, b, { w: "bold" }); g.angle(a, c, b, 1, 110); g.dot(c);
    txt(g, P(500, 660), "110 \u2212 30 = 80 degrees", { small: true });
  },
  bisect(g) {
    const A = P(260, 380), B = P(740, 380);
    g.seg(A, B, { w: "bold" }); g.dot(A); g.dot(B); lab(g, A, "A", B); lab(g, B, "B", A);
    const [, , m] = perpBis(g, A, B, 330);
    g.dot(m); g.right(B, m, P(m.x, 100)); g.ticks(A, m, 1); g.ticks(m, B, 1); lab(g, m, "M", P(m.x + 60, m.y - 60));
  },
  compsupp(g) {
    const O = P(500, 500), a = P(900, 500), b = P(100, 500), c = M.polar(O, 360, 130);
    g.seg(b, a); g.seg(O, c); g.dot(O);
    g.angle(a, O, c, 1, 70); g.angle(c, O, b, 2, 50);
    txt(g, M.polar(O, 110, 65), "1", { small: true }); txt(g, M.polar(O, 95, 155), "2", { small: true });
    txt(g, P(500, 620), "angle 1 + angle 2 = 180", { small: true });
  },
  vertical(g) { vert(g); },
  proofvert(g) { vert(g); txt(g, P(500, 660), "angle 1 + angle 2 = 180 and angle 2 + angle 3 = 180", { small: true }); },
  perp(g) {
    const O = P(500, 350);
    lineArrows(g, P(120, 350), P(880, 350)); lineArrows(g, P(500, 40), P(500, 660));
    for (const [a, b] of [[P(600, 350), P(500, 250)], [P(500, 250), P(400, 350)], [P(400, 350), P(500, 450)], [P(500, 450), P(600, 350)]]) g.right(a, O, b);
  },
  perpdrop(g) {
    const y = 460, Pp = P(500, 150), r = 400, h = Math.sqrt(r * r - 310 * 310), A = P(500 - h, y), B = P(500 + h, y);
    lineArrows(g, P(60, y), P(940, y)); lab(g, P(940, y), "l", P(940, 0), { off: 26 });
    g.arc(Pp, r, M.dirDeg(Pp, B) - 8, M.dirDeg(Pp, A) + 8, { w: "thin" });
    const r2 = 300, Q = P(500, y + Math.sqrt(r2 * r2 - h * h));
    g.arc(A, r2, M.dirDeg(A, Q) - 10, M.dirDeg(A, Q) + 10, { w: "thin" }); g.arc(B, r2, M.dirDeg(B, Q) - 10, M.dirDeg(B, Q) + 10, { w: "thin" });
    g.seg(Pp, Q, { w: "bold" }); g.right(B, P(500, y), Pp);
    for (const [p, n] of [[Pp, "P"], [A, "A"], [B, "B"], [Q, "Q"]]) { g.dot(p); lab(g, p, n, P(500, 380)); }
  },
  parallel(g) {
    const X = P(330, 540), Pp = P(560, 200), u = M.unit(M.sub(Pp, X)), r = 120;
    lineArrows(g, P(60, 540), P(940, 540)); lineArrows(g, M.add(X, M.mul(u, -120)), M.add(Pp, M.mul(u, 150)));
    lineArrows(g, P(140, 200), P(940, 200), { w: "bold" });
    g.arc(X, r, -10, M.dirDeg(X, Pp) + 12, { w: "thin" }); g.arc(Pp, r, -10, M.dirDeg(X, Pp) + 12, { w: "thin" });
    g.angle(P(940, 540), X, Pp, 1, 60); g.angle(P(940, 200), Pp, M.add(Pp, M.mul(u, 100)), 1, 60);
    parMark(g, P(700, 540), P(800, 540)); parMark(g, P(700, 200), P(800, 200));
    g.dot(X); g.dot(Pp); lab(g, Pp, "P", P(Pp.x + 60, Pp.y + 70)); lab(g, X, "X", P(X.x + 60, X.y - 70));
  },
  rosette(g) {
    const c = P(500, 350), r = 150;
    g.circle(c, 2 * r, { w: "thin" }); g.circle(c, r);
    for (let i = 0; i < 6; i++) g.circle(M.polar(c, r, 90 + 60 * i), r);
    for (let i = 0; i < 6; i++) g.dot(M.polar(c, r, 90 + 60 * i), 4);
    g.dot(c, 4);
  },
  transform(g) {
    const T = [P(160, 520), P(380, 540), P(240, 330)], Ti = T.map((p) => M.add(M.rotate(p, P(270, 460), -40), P(430, -90)));
    shape(g, T, ["A", "B", "C"], { w: "bold" }); shape(g, Ti, ["A\u2032", "B\u2032", "C\u2032"], { w: "bold" });
    g.seg(P(420, 600), P(560, 600)); g.arrow(P(420, 600), P(560, 600));
    txt(g, P(490, 650), "preimage maps to image", { small: true });
  },
  translate(g) {
    const v = P(380, -150), T = [P(150, 560), P(360, 600), P(240, 400)], Ti = T.map((p) => M.add(p, v));
    shape(g, T, ["A", "B", "C"], { w: "bold" }); shape(g, Ti, ["A\u2032", "B\u2032", "C\u2032"], { w: "bold" });
    for (const p of T) { const q = M.add(p, v); g.seg(p, q, { w: "thin" }); g.arrow(p, q); }
    const a = P(600, 640), b = M.add(a, M.mul(v, 0.6)); g.seg(a, b, { w: "bold" }); g.arrow(a, b); txt(g, P(b.x + 50, b.y), "v", { italic: true });
  },
  reflect(g) {
    const m0 = P(560, 40), m1 = P(440, 680), T = [P(170, 300), P(380, 220), P(330, 470)], Ti = T.map((p) => M.reflect(p, m0, m1));
    g.seg(m0, m1); lab(g, m0, "m", P(m0.x - 100, m0.y), { off: 24 });
    shape(g, T, ["A", "B", "C"], { w: "bold" }); shape(g, Ti, ["A\u2032", "B\u2032", "C\u2032"], { w: "bold" });
    for (let i = 0; i < 3; i++) { const f = M.foot(T[i], m0, m1); g.seg(T[i], Ti[i], { dash: true, w: "thin" }); g.right(T[i], f, m0); g.ticks(T[i], f, i + 1); g.ticks(f, Ti[i], i + 1); }
  },
  rotate(g) {
    const O = P(470, 450), T = [P(640, 460), P(800, 480), P(700, 330)], Ti = T.map((p) => M.rotate(p, O, 70));
    shape(g, T, ["P", "Q", "R"], { w: "bold" }); shape(g, Ti, ["P\u2032", "Q\u2032", "R\u2032"], { w: "bold" });
    for (const p of T) g.arc(O, M.dist(O, p), M.dirDeg(O, p), M.dirDeg(O, p) + 70, { w: "thin", dash: true });
    g.seg(O, T[0], { w: "thin" }); g.seg(O, Ti[0], { w: "thin" }); g.angle(T[0], O, Ti[0], 1, 60);
    g.dot(O); lab(g, O, "O", P(O.x + 40, O.y - 40)); txt(g, M.polar(O, 105, 35), "70", { small: true });
  },
  tworeflect(g) {
    const O = P(240, 560), m1 = M.polar(O, 900, 0), m2 = M.polar(O, 900, 30);
    g.seg(O, m1); g.seg(O, m2); lab(g, M.polar(O, 720, 0), "m", P(700, 0), { off: 26 }); lab(g, M.polar(O, 720, 30), "n", P(700, 0), { off: 26 });
    const F = [P(560, 640), P(660, 640), P(600, 600)], F1 = F.map((p) => M.reflect(p, O, m1)), F2 = F1.map((p) => M.reflect(p, O, m2));
    shape(g, F, null, { w: "bold" }); shape(g, F1, null, { w: "thin", dash: true }); shape(g, F2, null, { w: "bold" });
    g.arc(O, M.dist(O, F[0]), M.dirDeg(O, F[0]), M.dirDeg(O, F2[0]), { w: "thin" }); g.dot(O); lab(g, O, "O", P(O.x + 60, O.y - 40));
    g.angle(m1, O, m2, 1, 110);
    txt(g, P(680, 120), "two reflections = rotation by 60", { small: true });
  },
  golf(g) {
    const o = P(140, 90), u = 80;
    for (let i = 0; i <= 9; i++) g.seg(P(o.x + i * u, o.y), P(o.x + i * u, o.y + 6 * u), { w: "thin" });
    for (let j = 0; j <= 6; j++) g.seg(P(o.x, o.y + j * u), P(o.x + 9 * u, o.y + j * u), { w: "thin" });
    const flag = [[0, 0], [1, 0], [1, 2], [2, 2], [2, 3], [0, 3]];
    const S = (x, y) => P(o.x + x * u, o.y + y * u);
    g.poly(flag.map(([x, y]) => S(1 + x, 2 + y)), { w: "bold" });
    g.poly(flag.map(([x, y]) => S(8 - y, 1 + x)), { dash: true });
    txt(g, P(500, 640), "Map the solid shape onto the dashed hole.", { small: true });
  },
  preserve(g) {
    const O = P(500, 620), T = [P(180, 520), P(380, 560), P(250, 340)], Ti = T.map((p) => M.rotate(p, O, -80));
    for (const tt of [T, Ti]) { shape(g, tt, null, { w: "bold" }); g.ticks(tt[0], tt[1], 1); g.ticks(tt[1], tt[2], 2); g.ticks(tt[2], tt[0], 3); g.angle(tt[1], tt[0], tt[2], 1); }
    g.dot(O); lab(g, O, "O", P(O.x, 0));
  },
  linesym(g) {
    const c = P(500, 350), H = M.regular(c, 280, 6, 90);
    g.poly(H, { w: "bold" });
    for (let i = 0; i < 3; i++) { g.seg(M.lerp(H[i], H[i + 3], -0.1), M.lerp(H[i], H[i + 3], 1.1), { dash: true, w: "thin" }); const a = M.mid(H[i], H[i + 1]), b = M.mid(H[i + 3], H[(i + 4) % 6]); g.seg(M.lerp(a, b, -0.12), M.lerp(a, b, 1.12), { dash: true, w: "thin" }); }
    txt(g, P(500, 680), "6 lines of symmetry", { small: true });
  },
  rotsym(g) {
    const c = P(500, 360);
    const blade = [P(0, 0), P(0, -230), P(110, -120)];
    for (let i = 0; i < 3; i++) g.poly(blade.map((p) => M.rotate(M.add(c, p), c, 120 * i)), { w: "bold" });
    g.arc(c, 280, 60, 165, { w: "thin" }); g.arrow(M.polar(c, 280, 160), M.polar(c, 280, 165)); g.dot(c);
    txt(g, M.polar(c, 320, 112), "120", { small: true });
  },
  koch(g) {
    const s = 170, o = P(160, 120), bump = [[0, 0], [50, 0], [85, -45], [120, 0], [170, 0]];
    for (let j = 0; j <= 3; j++) for (let i = 0; i < 4; i++) g.poly(bump.map(([x, y]) => P(o.x + i * s + x, o.y + j * s + y)), { open: true, w: j === 1 && i === 1 ? "bold" : "main" });
    for (let j = 0; j < 3; j++) for (let i = 0; i <= 4; i++) g.seg(P(o.x + i * s, o.y + j * s), P(o.x + i * s, o.y + (j + 1) * s), { w: (i === 1 || i === 2) && j === 0 ? "bold" : "main" });
    txt(g, P(500, 670), "A bump cut from one side is added to the opposite side.", { small: true });
  },
  congruent(g) {
    const T = [P(130, 560), P(430, 580), P(240, 260)], Ti = T.map((p) => P(1000 - p.x + 0, p.y - 40));
    for (const tt of [T, Ti]) { g.poly(tt, { w: "bold" }); g.ticks(tt[0], tt[1], 1); g.ticks(tt[1], tt[2], 2); g.ticks(tt[2], tt[0], 3); }
    shape(g, T, ["A", "B", "C"], { w: "bold" }); shape(g, Ti, ["D", "E", "F"], { w: "bold" });
  },
  correspond(g) { pairTri(g, { ticks: [1, 2, 3], angles: [1, 2, 3] }); txt(g, P(500, 660), "triangle ABC is congruent to triangle DEF", { small: true }); },
  ssafig(g) {
    const T = [P(100, 600), P(420, 600), P(200, 400)], c = P(100, 600), Tb = T.map((p) => M.dilate(p, c, 1.7)).map((p) => M.add(p, P(400, 0)));
    for (const tt of [T, Tb]) { g.poly(tt, { w: "bold" }); g.angle(tt[1], tt[0], tt[2], 1); g.angle(tt[0], tt[1], tt[2], 2); g.angle(tt[0], tt[2], tt[1], 3); }
    txt(g, P(500, 80), "Same three angles, different sizes: AAA is not a test.", { small: true });
  },
  sas(g) { pairTri(g, { ticks: [1, 0, 2], angles: [1, 0, 0] }); },
  asa(g) { pairTri(g, { ticks: [1, 0, 0], angles: [1, 2, 0] }); },
  sss(g) { pairTri(g, { ticks: [1, 2, 3], angles: [0, 0, 0] }); },
  proofsas(g) {
    const A = P(220, 130), D = P(780, 590), B = P(220, 590), C = P(780, 130), Mm = P(500, 360);
    g.seg(A, D); g.seg(B, C); g.seg(A, B, { w: "bold" }); g.seg(C, D, { w: "bold" });
    g.ticks(A, Mm, 1); g.ticks(Mm, D, 1); g.ticks(B, Mm, 2); g.ticks(Mm, C, 2);
    g.angle(A, Mm, B, 1, 50); g.angle(C, Mm, D, 1, 50);
    for (const [p, n] of [[A, "A"], [B, "B"], [C, "C"], [D, "D"]]) lab(g, p, n, Mm);
    lab(g, Mm, "M", P(Mm.x, Mm.y + 100), { off: 26 });
  },
  cpctc(g) {
    const B = P(500, 80), D = P(500, 630), A = P(250, 430), C = P(750, 430);
    shape(g, [A, B, C, D], ["A", "B", "C", "D"], { w: "bold" }); g.seg(B, D);
    g.ticks(A, B, 1); g.ticks(C, B, 1); g.angle(A, B, D, 1, 60); g.angle(D, B, C, 1, 70);
  },
  isosceles(g) {
    const A = P(500, 90), B = P(250, 600), C = P(750, 600), D = M.mid(B, C);
    shape(g, [A, B, C], ["A", "B", "C"], { w: "bold" }); g.seg(A, D, { dash: true, w: "thin" }); g.dot(D); lab(g, D, "D", A);
    g.ticks(A, B, 1); g.ticks(A, C, 1); g.angle(C, B, A, 2, 50); g.angle(A, C, B, 2, 50); g.angle(B, A, D, 1, 70); g.angle(D, A, C, 1, 80);
  },
  equilateral(g) {
    const T = M.regular(P(500, 400), 300, 3, 90);
    shape(g, T, ["A", "B", "C"], { w: "bold" });
    for (let i = 0; i < 3; i++) { g.ticks(T[i], T[(i + 1) % 3], 1); g.angle(T[(i + 2) % 3], T[i], T[(i + 1) % 3], 1, 44); }
  },
  ssa(g) {
    const A = P(120, 560), B = M.polar(A, 500, 30), r = 300, h = Math.sqrt(r * r - (A.y - B.y) ** 2), C1 = P(B.x - h, A.y), C2 = P(B.x + h, A.y);
    g.seg(A, P(930, 560)); g.arrow(A, P(930, 560)); g.seg(A, B, { w: "bold" });
    g.arc(B, r, M.dirDeg(B, C2) - 12, M.dirDeg(B, C1) + 12, { w: "thin" });
    g.seg(B, C1, { w: "bold" }); g.seg(B, C2, { w: "bold" }); g.angle(B, A, P(900, 560), 1, 80);
    for (const [p, n] of [[A, "A"], [B, "B"]]) lab(g, p, n, P(500, 620));
    lab(g, C1, "C\u2081", P(C1.x, 300), { off: 24 }); lab(g, C2, "C\u2082", P(C2.x, 300), { off: 24 }); [A, B, C1, C2].forEach((p) => g.dot(p));
    txt(g, M.polar(A, 120, 15), "30", { small: true }); txt(g, P(310, 400), "10", { small: true }); txt(g, P(B.x + 90, 420), "6", { small: true });
  },
  copytri(g) {
    const T = [P(100, 520), P(380, 560), P(200, 300)];
    shape(g, T, ["A", "B", "C"], { w: "bold" });
    const D = P(540, 560), E = M.add(D, P(M.dist(T[0], T[1]), 0)), rAC = M.dist(T[0], T[2]), rBC = M.dist(T[1], T[2]);
    const [p, q] = M.circleX(D, rAC, E, rBC), F = p.y < q.y ? p : q;
    g.seg(D, P(960, 560)); g.arc(D, rAC, M.dirDeg(D, F) - 12, M.dirDeg(D, F) + 12, { w: "thin" }); g.arc(E, rBC, M.dirDeg(E, F) - 12, M.dirDeg(E, F) + 12, { w: "thin" });
    shape(g, [D, E, F], ["D", "E", "F"], { w: "bold" });
  },
  justify(g) {
    const A = P(260, 380), B = P(740, 380);
    g.seg(A, B, { w: "bold" }); lab(g, A, "A", B); lab(g, B, "B", A);
    const [p, q, m] = perpBis(g, A, B, 330);
    for (const x of [A, B]) { g.seg(p, x, { w: "thin" }); g.seg(q, x, { w: "thin" }); }
    g.right(B, m, p); lab(g, m, "M", P(m.x + 60, m.y - 60));
  },
  inequality(g) {
    const B = P(150, 560), A = P(900, 560), C = M.polar(B, 700, 50), D = M.polar(B, 700, 22);
    g.seg(B, A, { w: "bold" }); g.seg(B, C, { w: "bold" }); g.seg(B, D);
    g.angle(A, B, D, 1, 120); g.angle(A, B, C, 2, 180);
    for (const [p, n] of [[A, "A"], [C, "C"], [D, "D"], [B, "B"]]) lab(g, p, n, P(500, 400));
    txt(g, P(560, 650), "angle ABC > angle ABD", { small: true });
  },
  extangle(g) {
    const A = P(330, 150), B = P(150, 560), C = P(600, 560), D = P(930, 560);
    shape(g, [A, B, C], ["A", "B", "C"], { w: "bold" }); g.seg(C, D); lab(g, D, "D", P(D.x, 0));
    g.angle(B, A, C, 1, 50); g.angle(C, B, A, 2, 50); g.angle(A, C, D, 3, 50);
  },
  sideangle(g) {
    const A = P(120, 560), B = P(880, 560), C = P(330, 170);
    shape(g, [A, B, C], ["A", "B", "C"], { w: "main" }); g.seg(A, B, { w: "bold" }); g.angle(A, C, B, 2, 50);
    txt(g, P(500, 640), "the longest side is opposite the largest angle", { small: true });
  },
  triineq(g) {
    const u = 80, A = P(180, 520), B = P(180 + 8 * u, 520);
    g.seg(A, B, { w: "bold" }); g.dot(A); g.dot(B);
    g.arc(A, 3 * u, 0, 180, { w: "thin" }); g.arc(B, 4 * u, 0, 180, { w: "thin" });
    g.seg(A, M.polar(A, 3 * u, 60)); g.seg(B, M.polar(B, 4 * u, 115));
    txt(g, P(500, 590), "8", { small: true }); txt(g, M.polar(A, 1.5 * u, 60 + 12), "3", { small: true }); txt(g, M.polar(B, 2 * u, 115 - 10), "4", { small: true });
    txt(g, P(500, 650), "3 + 4 < 8: the arcs never meet", { small: true });
  },
  hinge(g) {
    for (const [O, d] of [[P(100, 560), 40], [P(540, 560), 85]]) {
      const a = M.add(O, P(320, 0)), b = M.polar(O, 320, d);
      g.seg(O, a); g.seg(O, b); g.seg(a, b, { w: "bold" }); g.ticks(O, a, 1); g.ticks(O, b, 2); g.angle(a, O, b, 1, 60);
    }
    txt(g, P(500, 650), "larger included angle, longer third side", { small: true });
  },
  transversal(g) { transversalFig(g, false); },
  transversal8(g) { transversalFig(g, true); }
};
function vert(g) {
  const O = P(500, 350), a = M.polar(O, 430, 25), b = M.polar(O, 430, 205), c = M.polar(O, 430, 140), d = M.polar(O, 430, 320);
  lineArrows(g, a, b); lineArrows(g, c, d); g.dot(O);
  [[a, c], [c, b], [b, d], [d, a]].forEach(([p, q], i) => { g.angle(p, O, q, i % 2 ? 2 : 1, 50 + i * 4); const mDir = M.unit(M.add(M.unit(M.sub(p, O)), M.unit(M.sub(q, O)))); txt(g, M.add(O, M.mul(mDir, 105)), String(i + 1), { small: true }); });
}
function pairTri(g, { ticks, angles }) {
  const T = [P(100, 560), P(430, 580), P(230, 270)], Ti = T.map((p) => M.add(M.rotate(p, P(260, 470), -25), P(470, -40)));
  for (const [tt, nm] of [[T, ["A", "B", "C"]], [Ti, ["D", "E", "F"]]]) {
    shape(g, tt, nm, { w: "bold" });
    const sides = [[0, 1], [1, 2], [2, 0]];
    sides.forEach(([i, j], s) => { if (ticks[s]) g.ticks(tt[i], tt[j], ticks[s]); });
    for (let i = 0; i < 3; i++) if (angles[i]) g.angle(tt[(i + 2) % 3], tt[i], tt[(i + 1) % 3], angles[i], 44);
  }
}
function gridSmall(g) {
  const o = P(200, 620), u = 70;
  for (let x = 0; x <= 8; x++) g.seg(P(o.x + x * u, o.y), P(o.x + x * u, o.y - 8 * u), { w: "thin" });
  for (let y = 0; y <= 8; y++) g.seg(P(o.x, o.y - y * u), P(o.x + 8 * u, o.y - y * u), { w: "thin" });
  g.seg(o, P(o.x + 8 * u, o.y)); g.seg(o, P(o.x, o.y - 8 * u));
  txt(g, P(o.x - 24, o.y + 22), "0", { small: true });
  return (x, y) => P(o.x + x * u, o.y - y * u);
}
export { gridSmall, perpBis, sierp };
