// Average power: Set the peak current through a 10 \u03a9 resistor.
import { calc, f2 } from "../kit.js";
const F = f2, E = (x, d = 2) => x.toExponential(d).replace(/e\+?(-?)(\d+)/, (_, s, p) => " \u00d7 10^" + (s ? "\u2212" : "") + p).replace("-", "\u2212"), R = (a) => a[Math.floor(Math.random() * a.length)];
export default function build(ctx) {
  const k = calc(ctx, {
    st: {},
    sliders: [{ key: "i", label: "I_max", min: 1, max: 10, step: 0.5, value: 4, unit: "A", d: 1 }],
    cuts: [
    { id: "try", label: "Waves: tap to explain", tap: (st, c) => { return "Average power is half the peak."; } }],
    show: (st) => `P_max = ${F(st.i * st.i * 10, 0)} W, P_avg = ${F(st.i * st.i * 5, 0)} W\nI_eff = ${F(st.i * 0.707, 2)} A`,
  });
  ctx.art.touchable(["try"]);
  return { destroy() {} };
}
