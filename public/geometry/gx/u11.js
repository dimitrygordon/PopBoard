// Unit 11 interactives: polygons approaching pi (11.3), circle wedges rearranged (11.5).
import { M, P, txt, num } from "./kit.js";

export const GX = {
  pi: {
    title: "Polygons approaching pi",
    how: "Increase n. The inside and outside polygons close in on a circle of diameter 1.",
    mount(B, U) {
      let n = 6;
      U.slider({ label: "Sides n", min: 3, max: 96, value: n }, (v) => { n = v; B.update(); });
      B.draw((g) => {
        const O = P(560, 450), r = 360;
        g.circle(O, r, { w: "thin" });
        const ins = Array.from({ length: n }, (_, i) => M.polar(O, r, 90 + (360 / n) * i)), R = r / Math.cos(Math.PI / n), out = Array.from({ length: n }, (_, i) => M.polar(O, R, 90 + (360 / n) * i));
        g.poly(ins, { w: "bold" }); g.poly(out, { w: "main" });
        const pin = n * Math.sin(Math.PI / n), pout = n * Math.tan(Math.PI / n);
        txt(g, P(1260, 330), `inside: ${pin.toFixed(5)}`, { small: true }); txt(g, P(1260, 400), "\u03c0 = 3.14159", { bold: true }); txt(g, P(1260, 470), `outside: ${pout.toFixed(5)}`, { small: true });
        U.read(`<p>Diameter 1. Inscribed ${n}-gon perimeter: ${pin.toFixed(5)}. Circumscribed: ${pout.toFixed(5)}. The gap is ${num(pout - pin, 5)}, and \u03c0 is trapped between them.</p>`);
      });
    }
  },
  wedges: {
    title: "Circle wedges rearranged",
    how: "Cut the circle into more wedges and lay them head to tail.",
    mount(B, U) {
      let n = 8;
      U.slider({ label: "Wedges", min: 4, max: 48, step: 2, value: n }, (v) => { n = v; B.update(); });
      B.draw((g) => {
        const r = 170, O = P(260, 450), half = 180 / n;
        g.circle(O, r, { w: "bold" });
        for (let i = 0; i < n; i++) g.seg(O, M.polar(O, r, (360 / n) * i), { w: n > 24 ? "thin" : "main" });
        const w = 2 * r * Math.sin((Math.PI) / n), x0 = 560, y = 450 + r / 2;
        for (let i = 0; i < n; i++) {
          const up = i % 2 === 0, cx = x0 + (i * w) / 2 + w / 2, apex = up ? P(cx, y - r) : P(cx, y);
          const mid = up ? 270 : 90;
          const p1 = M.polar(apex, r, mid - half), p2 = M.polar(apex, r, mid + half);
          g.seg(apex, p1, { w: n > 24 ? "thin" : "main" }); g.seg(apex, p2, { w: n > 24 ? "thin" : "main" }); g.arc(apex, r, mid - half, mid + half, { w: "bold" });
        }
        const len = (n / 2) * w;
        txt(g, P(x0 + len / 2, y + 90), `base \u2248 \u03c0r = ${num(len / r, 3)}r`, { small: true });
        U.read(`<p>${n} wedges make a shape that looks more and more like a parallelogram (then a rectangle) with height r and base half the circumference, \u03c0r. So the area is \u03c0r \u00b7 r = \u03c0r\u00b2.</p>`);
      });
    }
  }
};
