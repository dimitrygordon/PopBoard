// Reshape: Tap to reshape the lens.
import { calc, f2 } from "../kit.js";
const F = f2, E = (x, d = 2) => x.toExponential(d).replace(/e\+?(-?)(\d+)/, (_, s, p) => " \u00d7 10^" + (s ? "\u2212" : "") + p).replace("-", "\u2212"), R = (a) => a[Math.floor(Math.random() * a.length)];
export default function build(ctx) {
  const k = calc(ctx, {
    st: { i: 0 },
    sliders: [],
    cuts: [
    { id: "try", label: "Lens: tap to reshape", tap: (st, c) => { st.i = 1 - st.i; return ""; } }],
    show: (st) => st.i ? "thin center (concave): parallel rays diverge" : "thick center (convex): parallel rays converge",
  });
  ctx.art.touchable(["try"]);
  return { destroy() {} };
}
