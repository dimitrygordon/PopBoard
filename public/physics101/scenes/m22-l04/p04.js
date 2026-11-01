// Cloud: Tap to switch levels.
import { calc, f2 } from "../kit.js";
const F = f2, E = (x, d = 2) => x.toExponential(d).replace(/e\+?(-?)(\d+)/, (_, s, p) => " \u00d7 10^" + (s ? "\u2212" : "") + p).replace("-", "\u2212"), R = (a) => a[Math.floor(Math.random() * a.length)];
export default function build(ctx) {
  const k = calc(ctx, {
    st: { n: 1 },
    sliders: [],
    cuts: [
    { id: "try", label: "Cloud: tap to switch", tap: (st, c) => { st.n = 3 - st.n; return ""; } }],
    show: (st) => st.n === 1 ? "n = 1: dense, close in" : "n = 2: larger, with a node",
  });
  ctx.art.touchable(["try"]);
  return { destroy() {} };
}
