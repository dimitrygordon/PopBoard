// Example Problem 4: 84 C, 1.7 mm: alpha 1.7e-5, copper.
import { calc, f2 } from "../kit.js";
const F = f2, E = (x, d = 2) => x.toExponential(d).replace(/e\+?(-?)(\d+)/, (_, s, p) => " \u00d7 10^" + (s ? "\u2212" : "") + p).replace("-", "\u2212"), R = (a) => a[Math.floor(Math.random() * a.length)];
export default function build(ctx) {
  const k = calc(ctx, {
    st: { i: 0, N: ["copper", "aluminum", "iron"], A: [17e-6, 25e-6, 12e-6] },
    sliders: [{ key: "t", label: "Oven temperature", min: 21, max: 200, step: 1, value: 84, unit: "\\u00b0C", d: 0 }],
    cuts: [
    { id: "mys", label: "Identify metal: tap for another bar", tap: (st, c) => { st.i = (st.i + 1) % 3; return st.i ? "" : "The book's bar: \u03b1 = 1.7 \u00d7 10\u207b\u2075 per \u00b0C, close to copper."; } }],
    show: (st) => `\u0394L = ${F(st.A[st.i] * 1.6 * (st.t - 21) * 1000, 2)} mm\n\u03b1 = ${E(st.A[st.i], 1)} per \u00b0C \u2192 ${st.N[st.i]}`,
  });
  ctx.art.touchable(["mys"]);
  return { destroy() {} };
}
