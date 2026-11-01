// Circle: Tap to move the test charge around or away from a positive charge.
import { calc, f2 } from "../kit.js";
const F = f2, E = (x, d = 2) => x.toExponential(d).replace(/e\+?(-?)(\d+)/, (_, s, p) => " \u00d7 10^" + (s ? "\u2212" : "") + p).replace("-", "\u2212"), R = (a) => a[Math.floor(Math.random() * a.length)];
export default function build(ctx) {
  const k = calc(ctx, {
    st: { i: 0 },
    sliders: [],
    cuts: [
    { id: "try", label: "Charge: tap to switch moves", tap: (st, c) => { st.i = 1 - st.i; return ""; } }],
    show: (st) => st.i ? "outward: potential drops" : "around a circle: zero work, equipotential",
  });
  ctx.art.touchable(["try"]);
  return { destroy() {} };
}
