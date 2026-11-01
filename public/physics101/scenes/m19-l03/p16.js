// Example Problem 6: 90.0 V: 1.50, 3.00, 4.50 A; R 10.0 ohm; I 9.00 A.
import { calc, f2 } from "../kit.js";
const F = f2, E = (x, d = 2) => x.toExponential(d).replace(/e\+?(-?)(\d+)/, (_, s, p) => " \u00d7 10^" + (s ? "\u2212" : "") + p).replace("-", "\u2212"), R = (a) => a[Math.floor(Math.random() * a.length)];
export default function build(ctx) {
  const k = calc(ctx, {
    st: {},
    sliders: [{ key: "v", label: "\\u0394V", min: 10, max: 120, step: 1, value: 90, unit: "V", d: 0 }],
    cuts: [
    { id: "try", label: "Circuit: tap for the book's 90.0 V", tap: (st, c) => { st.v = 90; c.v.set(90); return "1.50 A, 3.00 A, 4.50 A; R = 10.0 \u03a9; I = 9.00 A."; } }],
    show: (st) => `${F(st.v / 60, 2)} A, ${F(st.v / 30, 2)} A, ${F(st.v / 20, 2)} A\nR = 10.0 \u03a9, I = ${F(st.v / 10, 2)} A`,
  });
  ctx.art.touchable(["try"]);
  return { destroy() {} };
}
