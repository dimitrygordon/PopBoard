// Plasma sphere: Tap the plasma sphere.
import { calc, f2 } from "../kit.js";
const F = f2, E = (x, d = 2) => x.toExponential(d).replace(/e\+?(-?)(\d+)/, (_, s, p) => " \u00d7 10^" + (s ? "\u2212" : "") + p).replace("-", "\u2212"), R = (a) => a[Math.floor(Math.random() * a.length)];
export default function build(ctx) {
  const k = calc(ctx, {
    st: { t: 0 },
    sliders: [],
    cuts: [
    { id: "try", label: "Sphere: tap to touch", tap: (st, c) => { st.t = 1 - st.t; return ""; } }],
    show: (st) => st.t ? "finger on the glass: the streams bend toward it" : "no touch: streams spread evenly",
  });
  ctx.art.touchable(["try"]);
  return { destroy() {} };
}
