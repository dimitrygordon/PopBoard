// Self-inductance: Slide time after closing the switch (12 V, 4.0 \u03a9).
import { calc, f2 } from "../kit.js";
const F = f2, E = (x, d = 2) => x.toExponential(d).replace(/e\+?(-?)(\d+)/, (_, s, p) => " \u00d7 10^" + (s ? "\u2212" : "") + p).replace("-", "\u2212"), R = (a) => a[Math.floor(Math.random() * a.length)];
export default function build(ctx) {
  const k = calc(ctx, {
    st: {},
    sliders: [{ key: "t", label: "Time", min: 0, max: 5, step: 0.25, value: 1, unit: "ms", d: 2 }],
    cuts: [
    { id: "try", label: "Switch: tap to open it", tap: (st, c) => { return "Opening the switch: the coil's EMF makes a spark."; } }],
    show: (st) => `I = ${F(3 * (1 - Math.exp(-st.t)), 2)} A (max 3.0 A)`,
  });
  ctx.art.touchable(["try"]);
  return { destroy() {} };
}
