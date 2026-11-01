// Hanging rod: Tap to bring the next rod near a hanging negative rod.
import { calc, f2 } from "../kit.js";
const F = f2, E = (x, d = 2) => x.toExponential(d).replace(/e\+?(-?)(\d+)/, (_, s, p) => " \u00d7 10^" + (s ? "\u2212" : "") + p).replace("-", "\u2212"), R = (a) => a[Math.floor(Math.random() * a.length)];
export default function build(ctx) {
  const k = calc(ctx, {
    st: { i: 0 },
    sliders: [],
    cuts: [
    { id: "try", label: "Rods: tap to switch rods", tap: (st, c) => { st.i = 1 - st.i; return ""; } }],
    show: (st) => st.i ? "positive rod: the hanging rod turns toward it (attract)" : "negative rod: the hanging rod turns away (repel)",
  });
  ctx.art.touchable(["try"]);
  return { destroy() {} };
}
