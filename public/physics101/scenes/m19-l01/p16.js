// Example Problem 2: 30.0 V, 10.0 ohm gives 3.00 A.
import { calc, f2 } from "../kit.js";
const F = f2, E = (x, d = 2) => x.toExponential(d).replace(/e\+?(-?)(\d+)/, (_, s, p) => " \u00d7 10^" + (s ? "\u2212" : "") + p).replace("-", "\u2212"), R = (a) => a[Math.floor(Math.random() * a.length)];
export default function build(ctx) {
  const k = calc(ctx, {
    st: {},
    sliders: [{ key: "v", label: "\\u0394V", min: 1, max: 60, step: 0.5, value: 30, unit: "V", d: 1 }, { key: "r", label: "R", min: 1, max: 50, step: 0.5, value: 10, unit: "\\u03a9", d: 1 }],
    cuts: [
    { id: "try", label: "Ammeter: tap for the book's values", tap: (st, c) => { st.v = 30; st.r = 10; c.v.set(30); c.r.set(10); return "I = 3.00 A."; } }],
    show: (st) => `I = \u0394V/R = ${F(st.v / st.r, 2)} A`,
  });
  ctx.art.touchable(["try"]);
  return { destroy() {} };
}
