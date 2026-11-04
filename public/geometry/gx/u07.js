// Unit 7 interactives: shearing a triangle (7.3), Pythagorean dissection (7.6), Pythagoras tree (7.7).
import { M, P, lab, txt, num, shape } from "./kit.js";
import { pyTree } from "../geo-figures-b.js";

export const GX = {
  shear: {
    title: "Shearing a triangle",
    how: "Slide the top vertex along the dashed line. The base and height stay put.",
    mount(B, U) {
      const A = P(400, 720), Bb = P(900, 720), C = B.point(560, 280, { label: "C", constrain: (q) => P(q.x, 280) });
      B.draw((g) => {
        g.seg(P(60, 280), P(1540, 280), { dash: true, w: "thin" }); g.seg(P(60, 720), P(1540, 720), { w: "thin" });
        shape(g, [A, Bb, C], ["A", "B", "C"], { w: "bold" });
        const F = P(C.x, 720); g.seg(C, F, { dash: true, w: "thin" }); g.right(Bb, F, C);
        txt(g, P(C.x + 60, 500), "h = 4.4", { small: true });
        const area = (5 * 4.4) / 2;
        U.read(`<p>Base 5, height 4.4: area = \u00bd \u00d7 5 \u00d7 4.4 = <b>${num(area, 1)}</b> wherever C sits on the line. Perimeter: ${num((M.dist(A, Bb) + M.dist(Bb, C) + M.dist(C, A)) / 100, 2)}, which does change.</p>`);
      });
    }
  },
  pythag: {
    title: "Pythagorean dissection",
    how: "Drag A and B to change the right triangle. Switch views to rearrange four copies inside one big square.",
    mount(B, U) {
      const C = P(560, 560), A = B.point(560, 300, { label: "A", constrain: (q) => P(560, M.clamp(q.y, 340, 500)) }), Bb = B.point(880, 560, { label: "B", constrain: (q) => P(M.clamp(q.x, 620, 820), 560) });
      let view = "squares";
      U.choice("View", [["squares", "Squares on the sides"], ["rearrange", "Rearranged"]], view, (v) => { view = v; B.update(); });
      B.draw((g) => {
        const a = M.dist(C, Bb), b = M.dist(C, A), c = Math.hypot(a, b);
        if (view === "squares") {
          shape(g, [C, Bb, A], ["C", "B", "A"], { w: "bold" }); g.right(Bb, C, A);
          g.poly([C, Bb, P(Bb.x, C.y + a), P(C.x, C.y + a)]); g.poly([C, A, P(C.x - b, A.y), P(C.x - b, C.y)]);
          const v = M.sub(Bb, A), n = P(-v.y, v.x), q1 = M.sub(Bb, n), q2 = M.sub(A, n);
          g.poly([A, Bb, q1, q2]);
          txt(g, P(C.x + a / 2, C.y + a / 2), `a\u00b2 = ${num((a / 100) ** 2, 2)}`, { small: true });
          txt(g, P(C.x - b / 2, C.y - b / 2), `b\u00b2 = ${num((b / 100) ** 2, 2)}`, { small: true });
          txt(g, M.centroid(A, Bb, q1, q2), `c\u00b2 = ${num((c / 100) ** 2, 2)}`, { small: true });
        } else {
          const s = a + b, k = Math.min(1, 640 / s), A_ = a * k, B_ = b * k, S = s * k;
          const draw4 = (o, inner) => {
            g.poly([o, P(o.x + S, o.y), P(o.x + S, o.y + S), P(o.x, o.y + S)], { w: "bold" });
            inner(o);
          };
          draw4(P(120, 130), (o) => { // tilted square c^2 in the middle
            const p = [P(o.x + A_, o.y), P(o.x + S, o.y + A_), P(o.x + B_, o.y + S), P(o.x, o.y + B_)];
            g.poly(p); txt(g, M.centroid(...p), "c\u00b2", {});
          });
          draw4(P(860, 130), (o) => { // a^2 and b^2 in opposite corners
            g.poly([o, P(o.x + A_, o.y), P(o.x + A_, o.y + A_), P(o.x, o.y + A_)]); txt(g, P(o.x + A_ / 2, o.y + A_ / 2), "a\u00b2", {});
            g.poly([P(o.x + A_, o.y + A_), P(o.x + S, o.y + A_), P(o.x + S, o.y + S), P(o.x + A_, o.y + S)]); txt(g, P(o.x + A_ + B_ / 2, o.y + A_ + B_ / 2), "b\u00b2", {});
            g.seg(P(o.x + A_, o.y), P(o.x + S, o.y + A_)); g.seg(P(o.x, o.y + A_), P(o.x + A_, o.y + S));
          });
          txt(g, P(800, 840), "same big square, same four triangles: what is left must match", { small: true });
        }
        U.read(`<p>a\u00b2 + b\u00b2 = ${num((a / 100) ** 2, 2)} + ${num((b / 100) ** 2, 2)} = ${num((a / 100) ** 2 + (b / 100) ** 2, 2)}; c\u00b2 = ${num((c / 100) ** 2, 2)}.</p>`);
      });
    }
  },
  pytree: {
    title: "Pythagoras tree",
    how: "Grow the tree a level at a time, and change the angle of the right triangles.",
    mount(B, U) {
      let d = 5, ang = 45;
      U.slider({ label: "Levels", min: 0, max: 10, value: d }, (v) => { d = v; B.update(); });
      U.slider({ label: "Angle", min: 20, max: 70, value: ang, fmt: (v) => `${v}\u00b0` }, (v) => { ang = v; B.update(); });
      B.draw((g) => {
        const s = 150, a = P(800 - s / 2, 860), b = P(800 + s / 2, 860);
        pyTree({ ...g, poly: (pts) => g.poly(pts, { w: d > 7 ? "thin" : "main" }) }, a, b, d, ang);
        const n = 2 ** (d + 1) - 1;
        U.read(`<p>${n} squares. At each fork the two new squares' areas add up to the parent's (a\u00b2 + b\u00b2 = c\u00b2), so every level has the same total area.</p>`);
      });
    }
  }
};
