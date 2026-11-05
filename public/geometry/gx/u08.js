// Unit 8 interactives: dilate a polygon (8.2), dilation properties (8.3), divide a segment into n parts (8.6),
// Koch and Sierpinski scale factors (8.13).
import { M, P, lab, txt, createSteps, num, shape, tick } from "./kit.js";
import { kochPts } from "../geo-figures-b.js";
import { sierp } from "../geo-figures-a.js";

export const GX = {
  dilate: {
    title: "Dilate a polygon from a center",
    how: "Drag O or the triangle, set k, then step through.",
    kind: "construction",
    mount(B, U) {
      const O = B.point(260, 640, { label: "O" }), V = [B.point(520, 560, { label: "A" }), B.point(700, 600, { label: "B" }), B.point(580, 400, { label: "C" })];
      let k = 2;
      const N = ["A", "B", "C"], img = () => V.map((p) => M.dilate(p, O, k));
      U.slider({ label: "k", min: 0.25, max: 3, step: 0.25, value: k }, (v) => { k = v; B.update(); });
      const base = (g) => { shape(g, V, N, { w: "bold" }); lab(g, O, "O", P(O.x - 100, O.y + 60)); };
      const ray = (i) => ({ say: `Draw the ray from O through ${N[i]}, and mark ${N[i]}' at ${"k"} times the distance O${N[i]}.`, draw: (g, t) => { const q = img()[i]; const far = M.dist(O, q) > M.dist(O, V[i]) ? q : V[i]; g.edge(O, M.lerp(O, far, 1.08), t, { dash: true, w: "thin" }); if (t >= 1) { g.dot(q); lab(g, q, N[i] + "'", O); } } });
      const steps = [ray(0), ray(1), ray(2), { say: "Join the images. Each side is k times as long and parallel to the original.", draw: (g, t) => { const W = img(); for (let i = 0; i < 3; i++) g.edge(W[i], W[(i + 1) % 3], t, { w: "bold" }); } }];
      steps.intro = "a triangle, a center O and a scale factor k are given.";
      createSteps(B, U, steps, base, { done: "OA' = k \u00b7 OA for every point." });
    }
  },
  dilprops: {
    title: "Dilation properties",
    how: "Drag the center, the segment ends, and set k. The line through the center maps to itself.",
    mount(B, U) {
      const O = B.point(500, 500, { label: "O" }), Pp = B.point(700, 300, { label: "P" }), Q = B.point(820, 560, { label: "Q" }), L1 = B.point(300, 760, { label: "" });
      let k = 1.75;
      U.slider({ label: "k", min: 0.25, max: 3, step: 0.25, value: k }, (v) => { k = v; B.update(); });
      B.draw((g) => {
        const P2 = M.dilate(Pp, O, k), Q2 = M.dilate(Q, O, k), L2 = M.dilate(L1, O, k);
        g.line(O, L1, { w: "thin" }); lab(g, L1, "line through O", O);
        g.seg(Pp, Q, { w: "bold" }); g.seg(P2, Q2, { w: "bold" }); g.dot(L2, 4);
        g.seg(O, P2, { dash: true, w: "thin" }); g.seg(O, Q2, { dash: true, w: "thin" });
        lab(g, O, "O", P(O.x - 100, O.y)); lab(g, Pp, "P", Q); lab(g, Q, "Q", Pp); lab(g, P2, "P'", Q2); lab(g, Q2, "Q'", P2);
        const r = M.dist(P2, Q2) / (M.dist(Pp, Q) || 1), par = Math.abs(M.cross(M.unit(M.sub(Q, Pp)), M.unit(M.sub(Q2, P2)))) < 0.01;
        U.read(`<p>P'Q' \u00f7 PQ = ${num(r, 2)} = |k|. P'Q' is ${Math.abs(k - 1) < 1e-9 ? "the same segment as PQ" : par ? "parallel to PQ" : "on the same line"}. Points on a line through O land on that same line.</p>`);
      });
    }
  },
  divide: {
    title: "Divide a segment into n equal parts",
    how: "Drag A or B, choose n, then step through.",
    kind: "construction",
    mount(B, U) {
      const A = B.point(220, 560, { label: "A" }), Bb = B.point(1300, 600, { label: "B" });
      let n = 5;
      U.slider({ label: "n", min: 2, max: 8, value: n }, (v) => { n = v; B.update(); });
      const L = () => { const d = M.rotate(M.unit(M.sub(Bb, A)), P(0, 0), 35), s = Math.min(150, (M.dist(A, Bb) * 0.95) / n), pts = Array.from({ length: n + 1 }, (_, i) => M.add(A, M.mul(d, s * i))); return { d, s, pts }; };
      const base = (g) => { g.seg(A, Bb, { w: "bold" }); lab(g, A, "A", Bb); lab(g, Bb, "B", A); };
      const steps = [
        { say: "Draw any ray from A.", draw: (g, t) => { const s = L(); g.edge(A, M.add(A, M.mul(s.d, s.s * (n + 0.8))), t); } },
        { say: "Keep one compass opening and step it along the ray n times.", draw: (g, t) => { const s = L(); for (let i = 1; i <= n; i++) if (t * n >= i - 0.999) { tick(g, s.pts[i - 1], s.s, s.pts[i], Math.min(1, t * n - (i - 1)), 10); g.dot(s.pts[i], 4); } } },
        { say: "Join the last mark to B.", draw: (g, t) => { const s = L(); g.edge(s.pts[n], Bb, t); } },
        { say: "Through each other mark, draw a line parallel to that one (copy the angle). They cut AB into n equal parts.", draw: (g, t) => { const s = L(); const v = M.sub(Bb, s.pts[n]); for (let i = 1; i < n; i++) { const X = M.lineX(s.pts[i], M.add(s.pts[i], v), A, Bb); if (X) { g.edge(s.pts[i], X, t, { dash: true, w: "thin" }); if (t >= 1) g.dot(X); } } } }
      ];
      steps.intro = "segment AB is given.";
      createSteps(B, U, steps, base, { done: "Parallel lines cut the two lines proportionally, so the equal steps on the ray give equal parts on AB." });
    }
  },
  fractals: {
    title: "Koch and Sierpinski scale factors",
    how: "Pick a fractal and a stage. Track the scale factor, the number of copies, and the total length or area.",
    mount(B, U) {
      let f = "koch", d = 2;
      U.choice("Fractal", [["koch", "Koch curve"], ["sierp", "Sierpinski"]], f, (v) => { f = v; B.update(); });
      U.slider({ label: "Stage", min: 0, max: 6, value: d }, (v) => { d = v; B.update(); });
      B.draw((g) => {
        if (f === "koch") g.poly(kochPts(P(150, 640), P(1450, 640), Math.min(d, 6)), { open: true, w: d > 4 ? "thin" : "main" });
        else sierp({ ...g, poly: (p) => g.poly(p, { w: d > 4 ? "thin" : "main" }) }, P(800, 80), P(1360, 840), P(240, 840), d);
        const row = f === "koch" ? ["1/3", 4, `(4/3)<sup>${d}</sup> = ${num((4 / 3) ** d, 3)}`, "length", Math.log(4) / Math.log(3)] : ["1/2", 3, `(3/4)<sup>${d}</sup> = ${num((3 / 4) ** d, 3)}`, "area", Math.log(3) / Math.log(2)];
        U.read(`<table class="gx-table"><tr><th>Scale factor per stage</th><td>${row[0]}</td></tr><tr><th>Copies per stage</th><td>${row[1]}</td></tr><tr><th>Total ${row[3]}</th><td>${row[2]}</td></tr><tr><th>Pieces now</th><td>${row[1]}<sup>${d}</sup> = ${row[1] ** d}</td></tr></table><p>${row[1]} copies at scale ${row[0]}: the pattern repeats at every size.</p>`);
      });
    }
  }
};
