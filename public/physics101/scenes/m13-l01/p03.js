// Hanging weights: Hang different weights on a 50 N/m spring.
import { calc, f2 } from "../kit.js";
const F = f2, E = (x, d = 2) => x.toExponential(d).replace(/e\+?(-?)(\d+)/, (_, s, p) => " \u00d7 10^" + (s ? "\u2212" : "") + p).replace("-", "\u2212"), R = (a) => a[Math.floor(Math.random() * a.length)];
export default function build(ctx) {
  const k = calc(ctx, {
    st: {},
    sliders: [{ key: "w", label: "Weight", min: 0, max: 20, step: 1, value: 5, unit: "N", d: 0 }],
    cuts: [
    { id: "hang", label: "Stretch: tap to explain", tap: (st, c) => { return "Double the weight, double the stretch."; } }],
    show: (st) => `stretch = F/k = ${F(st.w / 50 * 100, 0)} cm`,
  });
  ctx.art.touchable(["hang"]);
  return { destroy() {} };
}
