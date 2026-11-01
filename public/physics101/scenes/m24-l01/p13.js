// Curve: Slide along the curve.
import { calc, f2 } from "../kit.js";
const F = f2, E = (x, d = 2) => x.toExponential(d).replace(/e\+?(-?)(\d+)/, (_, s, p) => " \u00d7 10^" + (s ? "\u2212" : "") + p).replace("-", "\u2212"), R = (a) => a[Math.floor(Math.random() * a.length)];
export default function build(ctx) {
  const k = calc(ctx, {
    st: {},
    sliders: [{ key: "a", label: "Mass number A", min: 2, max: 238, step: 1, value: 56, unit: "", d: 0 }],
    cuts: [
    { id: "try", label: "Curve: tap to explain", tap: (st, c) => { return "Peak at iron-56."; } }],
    show: (st) => st.a < 56 ? "can release energy by fusing" : st.a > 60 ? "can release energy by splitting" : "near iron: most stable",
  });
  ctx.art.touchable(["try"]);
  return { destroy() {} };
}
