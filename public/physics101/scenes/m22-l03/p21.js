// Bohr radius: Tap to calculate.
import { calc, f2 } from "../kit.js";
const F = f2, E = (x, d = 2) => x.toExponential(d).replace(/e\+?(-?)(\d+)/, (_, s, p) => " \u00d7 10^" + (s ? "\u2212" : "") + p).replace("-", "\u2212"), R = (a) => a[Math.floor(Math.random() * a.length)];
export default function build(ctx) {
  const k = calc(ctx, {
    st: { s: 0 },
    sliders: [],
    cuts: [
    { id: "try", label: "Equation: tap to calculate", tap: (st, c) => { st.s = 1; return ""; } }],
    show: (st) => st.s ? "r\u2081 = h\u00b2/(4\u03c0\u00b2kmq\u00b2) = 5.3 \u00d7 10\u207b\u00b9\u00b9 m = 0.053 nm" : "plug in h, k, m, q",
  });
  ctx.art.touchable(["try"]);
  return { destroy() {} };
}
