// Quartz: Change the crystal's thickness.
import { calc, f2 } from "../kit.js";
const F = f2, E = (x, d = 2) => x.toExponential(d).replace(/e\+?(-?)(\d+)/, (_, s, p) => " \u00d7 10^" + (s ? "\u2212" : "") + p).replace("-", "\u2212"), R = (a) => a[Math.floor(Math.random() * a.length)];
export default function build(ctx) {
  const k = calc(ctx, {
    st: {},
    sliders: [{ key: "d", label: "Thickness", min: 0.1, max: 1, step: 0.05, value: 0.5, unit: "mm", d: 2 }],
    cuts: [
    { id: "try", label: "Crystal: tap to explain", tap: (st, c) => { return "Thinner crystal, higher frequency."; } }],
    show: (st) => `f \u2248 ${F(1.66 / st.d, 2)} MHz`,
  });
  ctx.art.touchable(["try"]);
  return { destroy() {} };
}
