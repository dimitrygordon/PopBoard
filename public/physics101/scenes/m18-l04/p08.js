// Example Problem 4: 1800 N/C: 27 V, 4.3e-18 J.
import { calc, f2 } from "../kit.js";
const F = f2, E = (x, d = 2) => x.toExponential(d).replace(/e\+?(-?)(\d+)/, (_, s, p) => " \u00d7 10^" + (s ? "\u2212" : "") + p).replace("-", "\u2212"), R = (a) => a[Math.floor(Math.random() * a.length)];
export default function build(ctx) {
  const k = calc(ctx, {
    st: {},
    sliders: [{ key: "e", label: "E", min: 500, max: 5000, step: 100, value: 1800, unit: "N/C", d: 0 }],
    cuts: [
    { id: "try", label: "Proton: tap for the book's 1800 N/C", tap: (st, c) => { st.e = 1800; c.e.set(1800); return "\u0394V = 27 V, W = 4.3 \u00d7 10\u207b\u00b9\u2078 J."; } }],
    show: (st) => `\u0394V = ${F(st.e * 0.015, 1)} V\nW = q\u0394V = ${E(1.602e-19 * st.e * 0.015, 1)} J`,
  });
  ctx.art.touchable(["try"]);
  return { destroy() {} };
}
