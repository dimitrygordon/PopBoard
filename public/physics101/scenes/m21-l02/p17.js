// Transmission: Choose the transmission voltage for 10 MW on a 5.0 \u03a9 line.
import { calc, f2 } from "../kit.js";
const F = f2, E = (x, d = 2) => x.toExponential(d).replace(/e\+?(-?)(\d+)/, (_, s, p) => " \u00d7 10^" + (s ? "\u2212" : "") + p).replace("-", "\u2212"), R = (a) => a[Math.floor(Math.random() * a.length)];
export default function build(ctx) {
  const k = calc(ctx, {
    st: {},
    sliders: [{ key: "v", label: "Voltage", min: 10, max: 500, step: 10, value: 100, unit: "kV", d: 0 }],
    cuts: [
    { id: "try", label: "Line: tap to explain", tap: (st, c) => { return "Higher voltage, smaller current, less waste."; } }],
    show: (st) => `I = ${F(1e4 / st.v, 0)} A, waste = ${F((1e4 / st.v) ** 2 * 5 / 1000, 1)} kW`,
  });
  ctx.art.touchable(["try"]);
  return { destroy() {} };
}
