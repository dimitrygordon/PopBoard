// Side mirror: Tap to switch the side mirror.
import { calc, f2 } from "../kit.js";
const F = f2, E = (x, d = 2) => x.toExponential(d).replace(/e\+?(-?)(\d+)/, (_, s, p) => " \u00d7 10^" + (s ? "\u2212" : "") + p).replace("-", "\u2212"), R = (a) => a[Math.floor(Math.random() * a.length)];
export default function build(ctx) {
  const k = calc(ctx, {
    st: { i: 0 },
    sliders: [],
    cuts: [
    { id: "try", label: "Mirror: tap to switch", tap: (st, c) => { st.i = 1 - st.i; return st.i ? "Objects in mirror are closer than they appear." : ""; } }],
    show: (st) => st.i ? "convex: wide view, cars look smaller and farther" : "plane: narrow view, true size",
  });
  ctx.art.touchable(["try"]);
  return { destroy() {} };
}
