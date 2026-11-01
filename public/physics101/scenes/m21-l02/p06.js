// Load: Add weight for the motor to lift.
import { calc, f2 } from "../kit.js";
const F = f2, E = (x, d = 2) => x.toExponential(d).replace(/e\+?(-?)(\d+)/, (_, s, p) => " \u00d7 10^" + (s ? "\u2212" : "") + p).replace("-", "\u2212"), R = (a) => a[Math.floor(Math.random() * a.length)];
export default function build(ctx) {
  const k = calc(ctx, {
    st: {},
    sliders: [{ key: "w", label: "Load", min: 0, max: 50, step: 5, value: 10, unit: "N", d: 0 }],
    cuts: [
    { id: "try", label: "Motor: tap to explain", tap: (st, c) => { return "Slower motor, less back EMF, more current."; } }],
    show: (st) => `speed ${F(100 - st.w * 1.6, 0)}%, current ${F(0.5 + st.w * 0.08, 1)} A`,
  });
  ctx.art.touchable(["try"]);
  return { destroy() {} };
}
