// Example Problem 1: 3.0 W, 9.0e2 J in 5.0 min.
import { calc, f2 } from "../kit.js";
const F = f2, E = (x, d = 2) => x.toExponential(d).replace(/e\+?(-?)(\d+)/, (_, s, p) => " \u00d7 10^" + (s ? "\u2212" : "") + p).replace("-", "\u2212"), R = (a) => a[Math.floor(Math.random() * a.length)];
export default function build(ctx) {
  const k = calc(ctx, {
    st: {},
    sliders: [{ key: "t", label: "Time", min: 0, max: 10, step: 0.5, value: 5, unit: "min", d: 1 }],
    cuts: [
    { id: "try", label: "Meter: tap for the book's 5.0 min", tap: (st, c) => { st.t = 5; c.t.set(5); return "P = 3.0 W, E = 9.0 \u00d7 10\u00b2 J."; } }],
    show: (st) => `P = 3.0 W\nE = Pt = ${F(3 * st.t * 60, 0)} J`,
  });
  ctx.art.touchable(["try"]);
  return { destroy() {} };
}
