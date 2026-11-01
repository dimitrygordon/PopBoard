// Wave model: Slow the wave in the second medium (incidence 40\u00b0).
import { calc, f2 } from "../kit.js";
const F = f2, E = (x, d = 2) => x.toExponential(d).replace(/e\+?(-?)(\d+)/, (_, s, p) => " \u00d7 10^" + (s ? "\u2212" : "") + p).replace("-", "\u2212"), R = (a) => a[Math.floor(Math.random() * a.length)];
export default function build(ctx) {
  const k = calc(ctx, {
    st: {},
    sliders: [{ key: "v", label: "v\\u2082/v\\u2081", min: 0.4, max: 1, step: 0.02, value: 0.75, unit: "", d: 2 }],
    cuts: [
    { id: "try", label: "Wavefronts: tap to explain", tap: (st, c) => { return "sin\u03b8\u2082/sin\u03b8\u2081 = v\u2082/v\u2081."; } }],
    show: (st) => `\u03b8\u2082 = ${F(Math.asin(st.v * Math.sin(40 * Math.PI / 180)) * 180 / Math.PI, 1)}\u00b0`,
  });
  ctx.art.touchable(["try"]);
  return { destroy() {} };
}
