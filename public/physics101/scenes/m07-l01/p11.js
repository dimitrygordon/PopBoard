// F = G m1 m2 / r^2: a mass factor k multiplies F by k; a distance factor k divides F by k^2.
import { calc, f2 } from "../kit.js";
const F = f2, E = (x, d = 2) => x.toExponential(d).replace(/e\+?(-?)(\d+)/, (_, s, p) => " \u00d7 10^" + (s ? "\u2212" : "") + p).replace("-", "\u2212"), R = (a) => a[Math.floor(Math.random() * a.length)];
export default function build(ctx) {
  const k = calc(ctx, {
    st: { w: 0, N: ["mass 1", "mass 2", "the distance"] },
    sliders: [{ key: "k", label: "Factor", min: 0.5, max: 4, step: 0.5, value: 2, unit: "\\u00d7", d: 1 }],
    cuts: [
    { id: "what", label: "What: tap to change what you multiply", tap: (st, c) => { st.w = (st.w + 1) % 3; return ""; } }],
    show: (st) => `multiply ${st.N[st.w]} by ${F(st.k, 1)}\nnew F = ${F(st.w < 2 ? st.k : 1 / st.k ** 2, 3)} \u00d7 old F`,
  });
  ctx.art.touchable(["what"]);
  return { destroy() {} };
}
