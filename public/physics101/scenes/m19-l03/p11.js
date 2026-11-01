// Example Problem 5: 470 ohm gives 4.9 V.
import { calc, f2 } from "../kit.js";
const F = f2, E = (x, d = 2) => x.toExponential(d).replace(/e\+?(-?)(\d+)/, (_, s, p) => " \u00d7 10^" + (s ? "\u2212" : "") + p).replace("-", "\u2212"), R = (a) => a[Math.floor(Math.random() * a.length)];
export default function build(ctx) {
  const k = calc(ctx, {
    st: {},
    sliders: [{ key: "r", label: "R\\u2082", min: 100, max: 1000, step: 10, value: 470, unit: "\\u03a9", d: 0 }],
    cuts: [
    { id: "try", label: "Voltmeter: tap for the book's 470 \\u03a9", tap: (st, c) => { st.r = 470; c.r.set(470); return "\u0394V\u2082 = 4.9 V."; } }],
    show: (st) => `\u0394V\u2082 = ${F(9 * st.r / (390 + st.r), 1)} V`,
  });
  ctx.art.touchable(["try"]);
  return { destroy() {} };
}
