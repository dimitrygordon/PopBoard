// Pool: Tap to toggle wavefront and ray views.
import { calc, f2 } from "../kit.js";
const F = f2, E = (x, d = 2) => x.toExponential(d).replace(/e\+?(-?)(\d+)/, (_, s, p) => " \u00d7 10^" + (s ? "\u2212" : "") + p).replace("-", "\u2212"), R = (a) => a[Math.floor(Math.random() * a.length)];
export default function build(ctx) {
  const k = calc(ctx, {
    st: { i: 0 },
    sliders: [],
    cuts: [
    { id: "tap", label: "Fronts or rays: tap to toggle", tap: (st, c) => { st.i = 1 - st.i; return ""; } }],
    show: (st) => st.i ? "rays: arrows at right angles to the fronts" : "wavefronts: circles of crests",
  });
  ctx.art.touchable(["tap"]);
  return { destroy() {} };
}
