// Thin lens: Enter f (negative for concave) and x_o.
import { calc, f2 } from "../kit.js";
const F = f2, E = (x, d = 2) => x.toExponential(d).replace(/e\+?(-?)(\d+)/, (_, s, p) => " \u00d7 10^" + (s ? "\u2212" : "") + p).replace("-", "\u2212"), R = (a) => a[Math.floor(Math.random() * a.length)];
export default function build(ctx) {
  const k = calc(ctx, {
    st: {},
    sliders: [{ key: "f", label: "f", min: -20, max: 20, step: 1, value: 10, unit: "cm", d: 0 }, { key: "x", label: "x_o", min: 1, max: 60, step: 1, value: 30, unit: "cm", d: 0 }],
    cuts: [
    { id: "try", label: "Prediction: tap to explain", tap: (st, c) => { return "Positive x_i: real, other side. Negative: virtual, same side."; } }],
    show: (st) => st.f === 0 || st.x === st.f ? "no image" : `x_i = ${F(st.f * st.x / (st.x - st.f), 1)} cm`,
  });
  ctx.art.touchable(["try"]);
  return { destroy() {} };
}
