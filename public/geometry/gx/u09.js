// Unit 9 interactive: ratios belong to angles (9.5).
import { M, P, lab, txt, num, shape } from "./kit.js";

export const GX = {
  ratios: {
    title: "Ratios belong to angles",
    how: "Set the angle, then scale the triangle. The side ratios depend only on the angle.",
    mount(B, U) {
      let a = 35, s = 1;
      U.slider({ label: "Angle A", min: 10, max: 80, value: a, fmt: (v) => `${v}\u00b0` }, (v) => { a = v; B.update(); });
      U.slider({ label: "Scale", min: 0.4, max: 1.6, step: 0.05, value: s, fmt: (v) => `\u00d7${v}` }, (v) => { s = v; B.update(); });
      B.draw((g) => {
        const hyp = 560 * s, A = P(260, 780), adj = hyp * Math.cos(a * M.DEG), opp = hyp * Math.sin(a * M.DEG);
        const k = Math.min(1, 1200 / adj, 700 / opp), C = P(A.x + adj * k, A.y), Bb = P(C.x, A.y - opp * k);
        shape(g, [A, C, Bb], ["A", "C", "B"], { w: "bold" }); g.right(A, C, Bb); g.angle(C, A, Bb, 1, 80);
        const o = opp / 100, d = adj / 100, h = hyp / 100;
        txt(g, P(C.x + 90, (C.y + Bb.y) / 2), `opp ${num(o, 2)}`, { small: true, anchor: "start" });
        txt(g, P((A.x + C.x) / 2, A.y + 50), `adj ${num(d, 2)}`, { small: true });
        txt(g, M.add(M.mid(A, Bb), P(-60, -40)), `hyp ${num(h, 2)}`, { small: true });
        U.read(`<table class="gx-table"><tr><th>opp / hyp (sin A)</th><td>${num(o / h, 4)}</td></tr><tr><th>adj / hyp (cos A)</th><td>${num(d / h, 4)}</td></tr><tr><th>opp / adj (tan A)</th><td>${num(o / d, 4)}</td></tr></table><p>Scale the triangle: the sides change but the ratios do not. All right triangles with a ${a}\u00b0 angle are similar (AA).</p>`);
      });
    }
  }
};
