// Heating: Increase the current through a 10 \u03a9 resistor.
import { calc, f2 } from "../kit.js";
const F = f2, E = (x, d = 2) => x.toExponential(d).replace(/e\+?(-?)(\d+)/, (_, s, p) => " \u00d7 10^" + (s ? "\u2212" : "") + p).replace("-", "\u2212"), R = (a) => a[Math.floor(Math.random() * a.length)];
export default function build(ctx) {
  const k = calc(ctx, {
    st: {},
    sliders: [{ key: "i", label: "I", min: 0, max: 3, step: 0.1, value: 1, unit: "A", d: 1 }],
    cuts: [
    { id: "try", label: "Thermometer: tap to explain", tap: (st, c) => { return "Electrons collide with atoms and give them energy."; } }],
    show: (st) => `thermal power = I\u00b2R = ${F(st.i * st.i * 10, 1)} W`,
  });
  ctx.art.touchable(["try"]);
  return { destroy() {} };
}
