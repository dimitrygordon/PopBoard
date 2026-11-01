// Achromat: Tune the second lens's index until red and blue meet.
import { calc, f2 } from "../kit.js";
const F = f2, E = (x, d = 2) => x.toExponential(d).replace(/e\+?(-?)(\d+)/, (_, s, p) => " \u00d7 10^" + (s ? "\u2212" : "") + p).replace("-", "\u2212"), R = (a) => a[Math.floor(Math.random() * a.length)];
export default function build(ctx) {
  const k = calc(ctx, {
    st: {},
    sliders: [{ key: "n", label: "Second lens n", min: 1.5, max: 1.8, step: 0.01, value: 1.5, unit: "", d: 2 }],
    cuts: [
    { id: "try", label: "Colors: tap to explain", tap: (st, c) => { return "An achromatic pair cancels the color spread."; } }],
    show: (st) => Math.abs(st.n - 1.62) < 0.015 ? "colors meet: no ring" : `color spread ${F(Math.abs(st.n - 1.62) * 20, 2)} mm`,
  });
  ctx.art.touchable(["try"]);
  return { destroy() {} };
}
