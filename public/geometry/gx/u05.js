// Unit 5 interactives: exterior angle inequality (5.2), triangle inequality (5.4), transversal across parallels (5.9),
// rotating a line and slopes (5.13).
import { M, P, lab, txt, deg, num, shape, grid } from "./kit.js";

export const GX = {
  extangle: {
    title: "Exterior angle inequality",
    how: "Drag the vertices. Compare the exterior angle at C with the two remote interior angles A and B.",
    mount(B, U) {
      const A = B.point(300, 640, { label: "A" }), Bb = B.point(560, 220, { label: "B" }), C = B.point(900, 640, { label: "C" });
      B.draw((g) => {
        shape(g, [A, Bb, C], ["A", "B", "C"], { w: "bold" });
        const D = M.add(C, M.mul(M.unit(M.sub(C, A)), 400));
        g.seg(C, D); lab(g, D, "D", C);
        const a = M.angle(Bb, A, C), b = M.angle(A, Bb, C), e = M.angle(Bb, C, D);
        g.angle(C, A, Bb, 1, 60); g.angle(A, Bb, C, 2, 60); g.angle(D, C, Bb, 3, 60);
        txt(g, P(1300, 300), `\u2220A = ${deg(a)}`); txt(g, P(1300, 370), `\u2220B = ${deg(b)}`); txt(g, P(1300, 440), `exterior = ${deg(e)}`, { bold: true });
        U.read(`<p>Exterior angle ${deg(e)} is greater than \u2220A (${deg(a)}) and greater than \u2220B (${deg(b)}).</p>`);
      });
    }
  },
  triineq: {
    title: "Triangle inequality",
    how: "Set three lengths. The two shorter sticks swing from the ends of the longest; see whether they can meet.",
    mount(B, U) {
      const L = [5, 3, 4];
      ["a", "b", "c"].forEach((n, i) => U.slider({ label: `Side ${n}`, min: 1, max: 12, value: L[i] }, (v) => { L[i] = v; B.update(); }));
      B.draw((g) => {
        const u = 90, [a, b, c] = L, A = P(800 - (c * u) / 2, 700), Bp = P(800 + (c * u) / 2, 700);
        g.seg(A, Bp, { w: "bold" }); g.dot(A); g.dot(Bp); txt(g, P(800, 760), `c = ${c}`);
        const cs = M.circleX(A, b * u, Bp, a * u);
        if (cs.length) {
          const C = cs[0].y < cs[1].y ? cs[0] : cs[1];
          g.seg(A, C, { w: "bold" }); g.seg(Bp, C, { w: "bold" }); g.dot(C);
          g.circle(A, b * u, { w: "thin", dash: true }); g.circle(Bp, a * u, { w: "thin", dash: true });
        } else {
          g.seg(A, P(A.x + Math.cos(-0.5) * b * u, A.y + Math.sin(-0.5) * b * u), { w: "bold" });
          g.seg(Bp, P(Bp.x - Math.cos(-0.5) * a * u, Bp.y + Math.sin(-0.5) * a * u), { w: "bold" });
          g.circle(A, b * u, { w: "thin", dash: true }); g.circle(Bp, a * u, { w: "thin", dash: true });
        }
        const s = [...L].sort((x, y) => x - y), ok = s[0] + s[1] > s[2];
        U.read(`<p>${s[0]} + ${s[1]} = ${s[0] + s[1]} ${ok ? ">" : s[0] + s[1] === s[2] ? "=" : "<"} ${s[2]}. ${ok ? "<b>A triangle forms.</b>" : s[0] + s[1] === s[2] ? "The sticks lie flat: no triangle." : "The short sticks cannot reach: no triangle."}</p>`);
      });
    }
  },
  transversal: {
    title: "Transversal across parallels",
    how: "Drag the transversal. Use the tilt slider to make the lines not parallel and watch the pairs stop matching.",
    mount(B, U) {
      const T0 = B.point(620, 120, { label: "" }), T1 = B.point(980, 800, { label: "" });
      let tilt = 0;
      U.slider({ label: "Tilt line n", min: -20, max: 20, value: 0, fmt: (v) => `${v}\u00b0` }, (v) => { tilt = v; B.update(); });
      B.draw((g) => {
        const m0 = P(0, 300), m1 = P(1600, 300), c = P(800, 600), n0 = M.rotate(P(0, 600), c, tilt), n1 = M.rotate(P(1600, 600), c, tilt);
        g.line(m0, m1, { w: "bold" }); g.line(n0, n1, { w: "bold" }); g.line(T0, T1);
        if (!tilt) { const k1 = P(300, 300), k2 = P(300, 600); lab(g, k1, "m", P(300, 400)); lab(g, k2, "n", P(300, 700)); }
        const X = M.lineX(m0, m1, T0, T1), Y = M.lineX(n0, n1, T0, T1);
        if (!X || !Y) return;
        const up = M.unit(M.sub(T0, T1)), r = 1;
        const at = (O, a, b) => { const R = M.add(O, a), L2 = M.add(O, b); return M.angle(R, O, L2); };
        const angs = (O, l) => { const e = M.unit(M.sub(l, O)); return [at(O, M.mul(e, r), M.mul(up, r)), at(O, M.mul(up, r), M.mul(e, -r)), at(O, M.mul(e, -r), M.mul(up, -r)), at(O, M.mul(up, -r), M.mul(e, r))]; };
        const A1 = angs(X, m1), A2 = angs(Y, n1);
        const put = (O, l, vals, base) => { const e = M.unit(M.sub(l, O)); const dirs = [M.add(e, up), M.sub(up, e), M.mul(M.add(e, up), -1), M.sub(e, up)]; vals.forEach((v, i) => txt(g, M.add(O, M.mul(M.unit(dirs[i]), 85)), `${base + i}: ${deg(v)}`, { small: true })); };
        put(X, m1, A1, 1); put(Y, n1, A2, 5); g.dot(X); g.dot(Y);
        U.read(tilt ? `<p>The lines are not parallel. Corresponding angles 1 and 5 differ: ${deg(A1[0])} and ${deg(A2[0])}.</p>` : `<p>Parallel lines: corresponding angles match (1 and 5: ${deg(A1[0])}), alternate interior angles match (4 and 6: ${deg(A1[3])} and ${deg(A2[1])}), and same-side interior angles add to 180.</p>`);
      });
    }
  },
  slopes: {
    title: "Rotating a line and slopes",
    how: "Turn the line. Its perpendicular turns with it. Watch the two slopes and their product.",
    mount(B, U) {
      let a = 30;
      U.slider({ label: "Angle", min: -85, max: 85, value: a, fmt: (v) => `${v}\u00b0` }, (v) => { a = v; B.update(); });
      B.draw((g) => {
        const O = P(800, 450), u = 80, S = grid(g, O, u, [-9, 9], [-5, 5], { axes: true });
        void S;
        const d = M.polar(P(0, 0), 1, a), e = M.polar(P(0, 0), 1, a + 90);
        g.line(O, M.add(O, d), { w: "bold" }); g.line(O, M.add(O, e), { w: "main" });
        g.right(M.add(O, d), O, M.add(O, e));
        const m1 = Math.tan(a * M.DEG), m2 = -1 / m1;
        // rise over run triangle on the main line
        const R = P(O.x + 2 * u, O.y), Q = P(O.x + 2 * u, O.y - 2 * u * m1);
        if (Math.abs(m1) < 2.2) { g.seg(O, R, { dash: true, w: "thin" }); g.seg(R, Q, { dash: true, w: "thin" }); txt(g, P(R.x + 70, (R.y + Q.y) / 2), `rise ${num(2 * m1, 2)}`, { small: true }); txt(g, P(O.x + u, O.y + 40), "run 2", { small: true }); }
        U.read(`<p>Slope of the line: <b>${num(m1, 3)}</b>. Slope of its perpendicular: <b>${a === 0 ? "undefined" : num(m2, 3)}</b>. ${a === 0 ? "A horizontal line is perpendicular to a vertical one." : `Product: ${num(m1 * m2, 3)}.`}</p>`);
      });
    }
  }
};
