// Collision force 50 N average over 0.020 s (sandbox): each impulse is 1.0 N s, opposite.
import { calc, f2 } from "../kit.js";
const F = f2, E = (x, d = 2) => x.toExponential(d).replace(/e\+?(-?)(\d+)/, (_, s, p) => " \u00d7 10^" + (s ? "\u2212" : "") + p).replace("-", "\u2212"), R = (a) => a[Math.floor(Math.random() * a.length)];
export default function build(ctx) {
  const k = calc(ctx, {
    st: { b: 0 },
    sliders: [],
    cuts: [
    { id: "roll", label: "Roll: tap to swap the balls", tap: (st, c) => { st.b = 1 - st.b; return "Different sizes, same size of force on each."; } }],
    show: (st) => `${st.b ? "big ball C, small ball D" : "small ball C, big ball D"}\nF on C = \u2212F on D = 50 N; impulses 1.0 N\u00b7s each, opposite`,
  });
  ctx.art.touchable(["roll"]);
  return { destroy() {} };
}
