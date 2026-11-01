// Bend: Bend the flat mirror into a curve.
import { calc, f2 } from "../kit.js";
const F = f2, E = (x, d = 2) => x.toExponential(d).replace(/e\+?(-?)(\d+)/, (_, s, p) => " \u00d7 10^" + (s ? "\u2212" : "") + p).replace("-", "\u2212"), R = (a) => a[Math.floor(Math.random() * a.length)];
export default function build(ctx) {
  const k = calc(ctx, {
    st: {},
    sliders: [{ key: "r", label: "Radius of curvature", min: 10, max: 200, step: 5, value: 100, unit: "cm", d: 0 }],
    cuts: [
    { id: "try", label: "Mirror: tap to explain", tap: (st, c) => { return "Tighter curve, smaller radius, C closer to the mirror."; } }],
    show: (st) => `C is ${st.r} cm from the mirror\nF is ${F(st.r / 2, 1)} cm away`,
  });
  ctx.art.touchable(["try"]);
  return { destroy() {} };
}
