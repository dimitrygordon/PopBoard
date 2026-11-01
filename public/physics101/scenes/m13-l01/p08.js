// Example Problem 2: T 1.22 s gives 9.78 N/kg.
import { calc, f2 } from "../kit.js";
const F = f2, E = (x, d = 2) => x.toExponential(d).replace(/e\+?(-?)(\d+)/, (_, s, p) => " \u00d7 10^" + (s ? "\u2212" : "") + p).replace("-", "\u2212"), R = (a) => a[Math.floor(Math.random() * a.length)];
export default function build(ctx) {
  const k = calc(ctx, {
    st: { i: 0, N: ["the book's lab", "the Moon", "a mystery planet"], G: [9.78, 1.62, 24.8] },
    sliders: [],
    cuts: [
    { id: "planet", label: "g: tap for the next place", tap: (st, c) => { st.i = (st.i + 1) % 3; return ""; } }],
    show: (st) => `${st.N[st.i]}: T = ${F(2 * Math.PI * Math.sqrt(0.369 / st.G[st.i]), 2)} s\ng = 4\u03c0\u00b2l/T\u00b2 = ${st.G[st.i]} N/kg`,
  });
  ctx.art.touchable(["planet"]);
  return { destroy() {} };
}
