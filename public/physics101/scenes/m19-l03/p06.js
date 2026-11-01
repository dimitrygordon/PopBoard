// Add resistors: Add 10 \u03a9 resistors to a 12 V series loop.
import { calc, f2 } from "../kit.js";
const F = f2, E = (x, d = 2) => x.toExponential(d).replace(/e\+?(-?)(\d+)/, (_, s, p) => " \u00d7 10^" + (s ? "\u2212" : "") + p).replace("-", "\u2212"), R = (a) => a[Math.floor(Math.random() * a.length)];
export default function build(ctx) {
  const k = calc(ctx, {
    st: {},
    sliders: [{ key: "n", label: "Resistors", min: 1, max: 5, step: 1, value: 1, unit: "", d: 0 }],
    cuts: [
    { id: "try", label: "Loop: tap to explain", tap: (st, c) => { return "R = R\u2081 + R\u2082 + ..."; } }],
    show: (st) => `R = ${st.n * 10} \u03a9, I = ${F(12 / (st.n * 10), 2)} A`,
  });
  ctx.art.touchable(["try"]);
  return { destroy() {} };
}
