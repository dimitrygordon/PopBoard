// Potentiometer: Slide the contact on a 0 to 100 \u03a9 potentiometer with a 12 V supply and a 10 \u03a9 motor.
import { calc, f2 } from "../kit.js";
const F = f2, E = (x, d = 2) => x.toExponential(d).replace(/e\+?(-?)(\d+)/, (_, s, p) => " \u00d7 10^" + (s ? "\u2212" : "") + p).replace("-", "\u2212"), R = (a) => a[Math.floor(Math.random() * a.length)];
export default function build(ctx) {
  const k = calc(ctx, {
    st: {},
    sliders: [{ key: "r", label: "Resistance in use", min: 0, max: 100, step: 5, value: 50, unit: "\\u03a9", d: 0 }],
    cuts: [
    { id: "try", label: "Motor: tap to explain", tap: (st, c) => { return "Less resistance, more current, faster motor."; } }],
    show: (st) => `I = ${F(12 / (10 + st.r), 2)} A`,
  });
  ctx.art.touchable(["try"]);
  return { destroy() {} };
}
