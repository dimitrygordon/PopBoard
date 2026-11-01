// Remove a branch: Tap to remove or restore the 6 \u03a9 branch.
import { calc, f2 } from "../kit.js";
const F = f2, E = (x, d = 2) => x.toExponential(d).replace(/e\+?(-?)(\d+)/, (_, s, p) => " \u00d7 10^" + (s ? "\u2212" : "") + p).replace("-", "\u2212"), R = (a) => a[Math.floor(Math.random() * a.length)];
export default function build(ctx) {
  const k = calc(ctx, {
    st: { o: 1 },
    sliders: [],
    cuts: [
    { id: "try", label: "6 \\u03a9 branch: tap to toggle", tap: (st, c) => { st.o = 1 - st.o; return ""; } }],
    show: (st) => `24 \u03a9: 5.0 A, 9 \u03a9: 13 A` + (st.o ? ", 6 \u03a9: 20 A\ntotal 38 A" : "\ntotal 18 A"),
  });
  ctx.art.touchable(["try"]);
  return { destroy() {} };
}
