// Voltmeter: Change the voltmeter's resistance across the 10 k\u03a9 lower half of a divider (two 10 k\u03a9 on 12 V).
import { calc, f2 } from "../kit.js";
const F = f2, E = (x, d = 2) => x.toExponential(d).replace(/e\+?(-?)(\d+)/, (_, s, p) => " \u00d7 10^" + (s ? "\u2212" : "") + p).replace("-", "\u2212"), R = (a) => a[Math.floor(Math.random() * a.length)];
export default function build(ctx) {
  const k = calc(ctx, {
    st: {},
    sliders: [{ key: "r", label: "Voltmeter R", min: 1, max: 1000, step: 1, value: 10, unit: "k\\u03a9", d: 0 }],
    cuts: [
    { id: "try", label: "Voltmeter: tap to explain", tap: (st, c) => { return "A good voltmeter has very high resistance."; } }],
    show: (st) => (() => { const p = 1 / (1 / 10 + 1 / st.r); return `true 6.00 V, reads ${F(12 * p / (10 + p), 2)} V`; })(),
  });
  ctx.art.touchable(["try"]);
  return { destroy() {} };
}
