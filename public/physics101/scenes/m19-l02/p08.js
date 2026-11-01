// Distance: Move the house farther from the plant (wire 0.20 \u03a9 per km, 10 A).
import { calc, f2 } from "../kit.js";
const F = f2, E = (x, d = 2) => x.toExponential(d).replace(/e\+?(-?)(\d+)/, (_, s, p) => " \u00d7 10^" + (s ? "\u2212" : "") + p).replace("-", "\u2212"), R = (a) => a[Math.floor(Math.random() * a.length)];
export default function build(ctx) {
  const k = calc(ctx, {
    st: {},
    sliders: [{ key: "d", label: "Distance", min: 1, max: 50, step: 1, value: 10, unit: "km", d: 0 }],
    cuts: [
    { id: "try", label: "Wire: tap to explain", tap: (st, c) => { return "Longer wire, more resistance, more I\u00b2R loss."; } }],
    show: (st) => `loss = I\u00b2R = ${F(100 * 0.2 * st.d, 0)} W`,
  });
  ctx.art.touchable(["try"]);
  return { destroy() {} };
}
