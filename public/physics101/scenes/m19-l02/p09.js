// High voltage: Slide the transmission voltage for 1.0 MW over a 10 \u03a9 line.
import { calc, f2 } from "../kit.js";
const F = f2, E = (x, d = 2) => x.toExponential(d).replace(/e\+?(-?)(\d+)/, (_, s, p) => " \u00d7 10^" + (s ? "\u2212" : "") + p).replace("-", "\u2212"), R = (a) => a[Math.floor(Math.random() * a.length)];
export default function build(ctx) {
  const k = calc(ctx, {
    st: {},
    sliders: [{ key: "v", label: "Voltage", min: 10, max: 500, step: 10, value: 100, unit: "kV", d: 0 }],
    cuts: [
    { id: "try", label: "Lines: tap to explain", tap: (st, c) => { return "Higher voltage, lower current, much less loss."; } }],
    show: (st) => `I = ${F(1000 / st.v, 1)} A\nloss = ${F((1000 / st.v) ** 2 * 10 / 1000, 2)} kW`,
  });
  ctx.art.touchable(["try"]);
  return { destroy() {} };
}
