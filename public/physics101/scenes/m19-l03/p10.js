// Example Problem 4 part 2: 39 ohm: 0.37 A, 30 V.
import { calc, f2 } from "../kit.js";
const F = f2, E = (x, d = 2) => x.toExponential(d).replace(/e\+?(-?)(\d+)/, (_, s, p) => " \u00d7 10^" + (s ? "\u2212" : "") + p).replace("-", "\u2212"), R = (a) => a[Math.floor(Math.random() * a.length)];
export default function build(ctx) {
  const k = calc(ctx, {
    st: { r: 47 },
    sliders: [],
    cuts: [
    { id: "try", label: "R\\u2081: tap to swap", tap: (st, c) => { st.r = st.r === 47 ? 39 : 47; return st.r === 39 ? "Current rises to 0.37 A; \u0394V\u2082 = 30 V." : ""; } }],
    show: (st) => `R\u2081 = ${st.r} \u03a9: I = ${F(45 / (st.r + 82), 2)} A, \u0394V\u2082 = ${F(45 / (st.r + 82) * 82, 0)} V`,
  });
  ctx.art.touchable(["try"]);
  return { destroy() {} };
}
