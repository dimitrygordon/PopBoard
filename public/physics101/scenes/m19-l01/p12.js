// I-V: Tap to switch devices, then slide the voltage.
import { calc, f2 } from "../kit.js";
const F = f2, E = (x, d = 2) => x.toExponential(d).replace(/e\+?(-?)(\d+)/, (_, s, p) => " \u00d7 10^" + (s ? "\u2212" : "") + p).replace("-", "\u2212"), R = (a) => a[Math.floor(Math.random() * a.length)];
export default function build(ctx) {
  const k = calc(ctx, {
    st: { i: 0 },
    sliders: [{ key: "v", label: "\\u0394V", min: 0, max: 2, step: 0.1, value: 1, unit: "V", d: 1 }],
    cuts: [
    { id: "try", label: "Graph: tap to switch devices", tap: (st, c) => { st.i = 1 - st.i; return st.i ? "Diode: curved, not ohmic." : "Resistor: straight line, ohmic."; } }],
    show: (st) => st.i ? `diode: I = ${F(st.v < 0.6 ? 0 : (st.v - 0.6) * 0.5, 2)} A` : `10 \u03a9 resistor: I = ${F(st.v / 10, 2)} A`,
  });
  ctx.art.touchable(["try"]);
  return { destroy() {} };
}
