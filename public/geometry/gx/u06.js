// Unit 6 interactives: parallelogram measures (6.2), Varignon midpoint quadrilateral (6.7), turtle walk (6.9),
// regular pentagon and star polygons (6.10).
import { starMax, starCycles } from "../geo-invariants.js";
import { M, P, lab, txt, createSteps, deg, num, shape, tick } from "./kit.js";

export const GX = {
  parallelogram: {
    title: "Parallelogram measures",
    how: "Drag A, B or D. C follows so ABCD stays a parallelogram.",
    mount(B, U) {
      const A = B.point(380, 680, { label: "A" }), Bb = B.point(1040, 680, { label: "B" }), D = B.point(560, 260, { label: "D" });
      B.draw((g) => {
        const C = M.add(Bb, M.sub(D, A)), Q = [A, Bb, C, D];
        shape(g, Q, ["A", "B", "C", "D"], { w: "bold" });
        g.seg(A, C, { w: "thin" }); g.seg(Bb, D, { w: "thin" });
        const O = M.mid(A, C); g.dot(O); g.ticks(A, O, 1); g.ticks(O, C, 1); g.ticks(Bb, O, 2); g.ticks(O, D, 2);
        const angs = [M.angle(D, A, Bb), M.angle(A, Bb, C), M.angle(Bb, C, D), M.angle(C, D, A)];
        const s = [M.dist(A, Bb), M.dist(Bb, C), M.dist(C, D), M.dist(D, A)].map((x) => num(x / 100, 2));
        U.read(`<table class="gx-table"><tr><th>Sides</th><td>AB ${s[0]}, BC ${s[1]}, CD ${s[2]}, DA ${s[3]}</td></tr><tr><th>Angles</th><td>A ${deg(angs[0])}, B ${deg(angs[1])}, C ${deg(angs[2])}, D ${deg(angs[3])}</td></tr><tr><th>Diagonals</th><td>AO ${num(M.dist(A, O) / 100, 2)} = OC; BO ${num(M.dist(Bb, O) / 100, 2)} = OD</td></tr></table><p>Opposite sides and angles are equal, neighbors add to 180, and the diagonals bisect each other.</p>`);
      });
    }
  },
  varignon: {
    title: "Varignon's midpoint quadrilateral",
    how: "Drag the four corners, even into a dart shape. Join the midpoints.",
    mount(B, U) {
      const V = [B.point(300, 650, { label: "A" }), B.point(1150, 720, { label: "B" }), B.point(1300, 200, { label: "C" }), B.point(560, 160, { label: "D" })];
      B.draw((g) => {
        shape(g, V, ["A", "B", "C", "D"], { w: "bold" });
        const Mi = V.map((p, i) => M.mid(p, V[(i + 1) % 4]));
        g.poly(Mi, { w: "main" }); Mi.forEach((p) => g.dot(p, 4));
        g.seg(V[0], V[2], { dash: true, w: "thin" }); g.seg(V[1], V[3], { dash: true, w: "thin" });
        const big = Math.abs(M.area(V)), small = Math.abs(M.area(Mi));
        U.read(`<p>The midpoint shape is always a parallelogram: each pair of opposite sides is parallel to a diagonal and half as long. Its area is ${num(small / 1e4, 2)}, half of ${num(big / 1e4, 2)}.</p>`);
      });
    }
  },
  turtle: {
    title: "Turtle walk: exterior angles",
    how: "Pick n and press Walk. The turtle turns at each corner. Add up the turns.",
    mount(B, U) {
      let n = 5, step = 0, anim = 0;
      U.slider({ label: "Sides n", min: 3, max: 12, value: n }, (v) => { n = v; step = 0; B.update(); });
      U.row();
      U.button("Walk", () => {
        cancelAnimationFrame(anim); step = 0;
        if (B.reduce) { step = n; B.update(); return; }
        const t0 = performance.now(); const go = (t) => { step = Math.min(n, (t - t0) / 700); B.update(); if (step < n) anim = requestAnimationFrame(go); }; anim = requestAnimationFrame(go);
      });
      U.button("Reset", () => { cancelAnimationFrame(anim); step = 0; B.update(); });
      B.draw((g) => {
        const s = Math.min(380, 1900 / n), turn = 360 / n, start = P(800 - s / 2, 800);
        const V = [start]; let h = 0;
        for (let i = 0; i < n; i++) { V.push(M.polar(V[i], s, h)); h += turn; }
        const done = Math.floor(step), part = step - done;
        for (let i = 0; i < n; i++) g.seg(V[i], V[i + 1], { w: i < done ? "bold" : "thin", dash: i >= done });
        for (let i = 1; i <= Math.min(done, n); i++) { const d = (i - 1) * turn; const ahead = M.polar(V[i], 90, d); g.seg(V[i], ahead, { dash: true, w: "thin" }); g.arc(V[i], 60, d, d + turn, { w: "main" }); }
        const pos = done < n ? M.lerp(V[done], V[done + 1], part) : V[n], hd = Math.min(done, n - 1) * turn + (done >= n ? turn : 0);
        const tip = M.polar(pos, 34, hd), l = M.polar(pos, 22, hd + 140), r = M.polar(pos, 22, hd - 140);
        g.poly([tip, l, r], { w: "bold", fill: "ink" });
        const total = Math.min(done, n) * turn;
        U.read(`<p>Each turn: 360 \u00f7 ${n} = ${num(turn, 2)}\u00b0. Turns so far: ${Math.min(done, n)}, total <b>${num(total, 1)}\u00b0</b>${done >= n ? ". One full turn, for any polygon." : "."}</p>`);
      });
      return { destroy: () => cancelAnimationFrame(anim) };
    }
  },
  pentagon: {
    title: "Regular pentagon and star polygons",
    how: "Step through the compass construction of a regular pentagon, then try other stars {n/k}.",
    kind: "construction",
    mount(B, U) {
      const O = B.point(560, 450, { label: "O" }), R = B.point(880, 450, { label: "R", constrain: (q) => P(q.x, O.y) });
      let sn = 5, sk = 2;
      const L = () => {
        const r = Math.abs(R.x - O.x), A = P(O.x, O.y - r), Rr = P(O.x + r, O.y), Lf = P(O.x - r, O.y), Mm = M.mid(O, Rr), ma = M.dist(Mm, A), N = P(Mm.x - ma, O.y), side = M.dist(A, N);
        const V = Array.from({ length: 5 }, (_, i) => M.polar(O, r, 90 + 72 * i));
        return { r, A, Rr, Lf, Mm, ma, N, side, V };
      };
      const base = (g) => { lab(g, O, "O", P(O.x + 60, O.y + 100)); };
      const steps = [
        { say: "Draw a circle with center O through R.", draw: (g, t) => { const s = L(); g.sweep(O, s.r, 0, 359.9, t); } },
        { say: "Draw the diameter through R, and the perpendicular radius OA.", draw: (g, t) => { const s = L(); g.edge(s.Lf, s.Rr, t); g.edge(O, s.A, t); if (t >= 1) { g.right(s.Rr, O, s.A); g.dot(s.A); lab(g, s.A, "A", O); } } },
        { say: "Bisect OR to find its midpoint M.", draw: (g, t) => { const s = L(); tick(g, O, s.r * 0.7, M.add(s.Mm, P(0, -s.r * 0.6)), t, 10); tick(g, s.Rr, s.r * 0.7, M.add(s.Mm, P(0, -s.r * 0.6)), t, 10); if (t >= 1) { g.dot(s.Mm); lab(g, s.Mm, "M", P(s.Mm.x, s.Mm.y - 100)); } } },
        { say: "With center M and radius MA, swing an arc down to the diameter at N.", draw: (g, t) => { const s = L(); g.sweep(s.Mm, s.ma, M.dirDeg(s.Mm, s.A), 180, t); if (t >= 1) { g.dot(s.N); lab(g, s.N, "N", P(s.N.x, s.N.y - 100)); g.seg(s.A, s.N, { dash: true, w: "thin" }); } } },
        { say: "AN is the side of the regular pentagon. Step it around the circle from A.", draw: (g, t) => { const s = L(); for (let i = 1; i < 5; i++) if (t * 4 >= i - 0.999) tick(g, s.V[i - 1], s.side, s.V[i], Math.min(1, t * 4 - (i - 1)), 8); if (t >= 1) s.V.forEach((p) => g.dot(p)); } },
        { say: "Join the marks: a regular pentagon.", draw: (g, t) => { const s = L(); for (let i = 0; i < 5; i++) g.edge(s.V[i], s.V[(i + 1) % 5], t, { w: "bold" }); } },
        { say: "Join every second mark: the star {5/2}. Use the sliders for other stars {n/k}.", draw: (g, t) => { const s = L(); const W = Array.from({ length: sn }, (_, i) => M.polar(O, s.r, 90 + (360 / sn) * i)); for (let i = 0; i < sn; i++) g.edge(W[i], W[(i + sk) % sn], t, { w: "main" }); } }
      ];
      steps.intro = "a center O and radius OR are given.";
      createSteps(B, U, steps, base, { done: "The skip satisfies 1≤k&lt;n/2. If gcd(n,k)>1 this is a compound of separate cycles, not one n-pointed star." });
      const describe = () => { const cycles=starCycles(sn,sk); U.read(`<p>{${sn}/${sk}}: ${cycles===1 ? "one circuit" : `a compound of ${cycles} cycles, not one n-pointed star`}. The point angle is 180 minus 360k/n degrees.</p>`); };
      U.slider({ label: "Star n", min: 5, max: 12, value: sn }, (v) => { sn = v; sk=Math.min(sk,starMax(sn)); skip.input.max=starMax(sn);skip.set(sk); B.update();describe(); });
      const skip=U.slider({ label: "Star k", min: 1, max: starMax(sn), value: sk }, (v) => { sk = v; B.update();describe(); });
      describe();
    }
  }
};
