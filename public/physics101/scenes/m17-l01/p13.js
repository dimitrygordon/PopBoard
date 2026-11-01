// Two rays: Set the soap film thickness (n = 1.33).
import { calc, f2 } from "../kit.js";
const F = f2, E = (x, d = 2) => x.toExponential(d).replace(/e\+?(-?)(\d+)/, (_, s, p) => " \u00d7 10^" + (s ? "\u2212" : "") + p).replace("-", "\u2212"), R = (a) => a[Math.floor(Math.random() * a.length)];
export default function build(ctx) {
  const k = calc(ctx, {
    st: {},
    sliders: [{ key: "d", label: "Thickness", min: 50, max: 400, step: 5, value: 100, unit: "nm", d: 0 }],
    cuts: [
    { id: "try", label: "Rays: tap to explain", tap: (st, c) => { return "Ray 1 flips; ray 2 doesn't. Bright when 2d = (m + \u00bd)\u03bb/n."; } }],
    show: (st) => `reinforced color: \u03bb = 4nd = ${F(4 * 1.33 * st.d, 0)} nm` + (4 * 1.33 * st.d > 700 ? " (infrared; next: " + F(4 * 1.33 * st.d / 3, 0) + " nm)" : ""),
  });
  ctx.art.touchable(["try"]);
  return { destroy() {} };
}
