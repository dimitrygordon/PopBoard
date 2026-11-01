// Example Problem 5: 450 V gives 6.4e-19 C, 4 electrons.
import { calc, f2 } from "../kit.js";
const F = f2, E = (x, d = 2) => x.toExponential(d).replace(/e\+?(-?)(\d+)/, (_, s, p) => " \u00d7 10^" + (s ? "\u2212" : "") + p).replace("-", "\u2212"), R = (a) => a[Math.floor(Math.random() * a.length)];
export default function build(ctx) {
  const k = calc(ctx, {
    st: {},
    sliders: [{ key: "v", label: "\\u0394V", min: 100, max: 1000, step: 5, value: 450, unit: "V", d: 0 }],
    cuts: [
    { id: "try", label: "Drop: tap for the book's 450 V", tap: (st, c) => { st.v = 450; c.v.set(450); return "q = 6.4 \u00d7 10\u207b\u00b9\u2079 C: 4 extra electrons."; } }],
    show: (st) => `q = F_g d/\u0394V = ${E(2.4e-14 * 0.012 / st.v, 2)} C\nn = q/e = ${F(2.4e-14 * 0.012 / st.v / 1.602e-19, 1)}`,
  });
  ctx.art.touchable(["try"]);
  return { destroy() {} };
}
