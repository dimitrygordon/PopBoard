// Drops: Tap to move the voltmeter (12 V, 0.020 \u03a9 wire, 6.0 \u03a9 resistor).
import { calc, f2 } from "../kit.js";
const F = f2, E = (x, d = 2) => x.toExponential(d).replace(/e\+?(-?)(\d+)/, (_, s, p) => " \u00d7 10^" + (s ? "\u2212" : "") + p).replace("-", "\u2212"), R = (a) => a[Math.floor(Math.random() * a.length)];
export default function build(ctx) {
  const k = calc(ctx, {
    st: { i: 0 },
    sliders: [],
    cuts: [
    { id: "try", label: "Voltmeter: tap to switch", tap: (st, c) => { st.i = 1 - st.i; return ""; } }],
    show: (st) => st.i ? `across the wire: ${F(12 * 0.02 / 6.02, 3)} V` : `across the resistor: ${F(12 * 6 / 6.02, 2)} V`,
  });
  ctx.art.touchable(["try"]);
  return { destroy() {} };
}
