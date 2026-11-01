// Predict: Change the drop across resistor 1 (battery 12 V).
import { calc, f2 } from "../kit.js";
const F = f2, E = (x, d = 2) => x.toExponential(d).replace(/e\+?(-?)(\d+)/, (_, s, p) => " \u00d7 10^" + (s ? "\u2212" : "") + p).replace("-", "\u2212"), R = (a) => a[Math.floor(Math.random() * a.length)];
export default function build(ctx) {
  const k = calc(ctx, {
    st: {},
    sliders: [{ key: "d", label: "\\u0394V\\u2081", min: 0, max: 12, step: 0.5, value: 4, unit: "V", d: 1 }],
    cuts: [
    { id: "try", label: "Voltmeter: tap to check", tap: (st, c) => { return `\u0394V\u2082 = ${F(12 - st.d, 1)} V.`; } }],
    show: (st) => `predict \u0394V\u2082 = 12 \u2212 ${F(st.d, 1)}`,
  });
  ctx.art.touchable(["try"]);
  return { destroy() {} };
}
