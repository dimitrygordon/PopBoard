// Spheres: Tap to switch between a solid and a hollow sphere.
import { calc, f2 } from "../kit.js";
const F = f2, E = (x, d = 2) => x.toExponential(d).replace(/e\+?(-?)(\d+)/, (_, s, p) => " \u00d7 10^" + (s ? "\u2212" : "") + p).replace("-", "\u2212"), R = (a) => a[Math.floor(Math.random() * a.length)];
export default function build(ctx) {
  const k = calc(ctx, {
    st: { i: 0 },
    sliders: [],
    cuts: [
    { id: "try", label: "Sphere: tap to switch", tap: (st, c) => { st.i = 1 - st.i; return "Excess charge always ends up on the outer surface."; } }],
    show: (st) => st.i ? "hollow sphere: all charge on the outside" : "solid sphere: all charge on the outside",
  });
  ctx.art.touchable(["try"]);
  return { destroy() {} };
}
