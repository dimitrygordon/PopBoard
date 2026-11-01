// One coulomb: Slide the coulomb around the 120 V circuit.
import { calc, f2 } from "../kit.js";
const F = f2, E = (x, d = 2) => x.toExponential(d).replace(/e\+?(-?)(\d+)/, (_, s, p) => " \u00d7 10^" + (s ? "\u2212" : "") + p).replace("-", "\u2212"), R = (a) => a[Math.floor(Math.random() * a.length)];
export default function build(ctx) {
  const k = calc(ctx, {
    st: {},
    sliders: [{ key: "s", label: "Position", min: 0, max: 3, step: 1, value: 0, unit: "", d: 0 }],
    cuts: [
    { id: "try", label: "Circuit: tap to explain", tap: (st, c) => { return "Energy gained at the generator equals energy lost at the motor."; } }],
    show: (st) => ["leaving the motor: 0 J above start", "in the generator: rising", "leaving the generator: 120 J", "in the motor: back down to 0 J"][st.s],
  });
  ctx.art.touchable(["try"]);
  return { destroy() {} };
}
