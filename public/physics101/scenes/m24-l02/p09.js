// Example Problem 2.
import { calc, f2 } from "../kit.js";
const F = f2, E = (x, d = 2) => x.toExponential(d).replace(/e\+?(-?)(\d+)/, (_, s, p) => " \u00d7 10^" + (s ? "\u2212" : "") + p).replace("-", "\u2212"), R = (a) => a[Math.floor(Math.random() * a.length)];
export default function build(ctx) {
  const k = calc(ctx, {
    st: { i: 0 },
    sliders: [],
    cuts: [
    { id: "try", label: "Equation: tap to switch", tap: (st, c) => { st.i = 1 - st.i; return ""; } }],
    show: (st) => st.i ? "Pb-209 \u2192 Bi-209 + e\u207b + antineutrino \u2713" : "Ra-226 \u2192 He-4 + Rn-222 \u2713",
  });
  ctx.art.touchable(["try"]);
  return { destroy() {} };
}
