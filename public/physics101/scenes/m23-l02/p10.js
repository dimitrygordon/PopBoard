// Amplify: Nudge the base current.
import { calc, f2 } from "../kit.js";
const F = f2, E = (x, d = 2) => x.toExponential(d).replace(/e\+?(-?)(\d+)/, (_, s, p) => " \u00d7 10^" + (s ? "\u2212" : "") + p).replace("-", "\u2212"), R = (a) => a[Math.floor(Math.random() * a.length)];
export default function build(ctx) {
  const k = calc(ctx, {
    st: {},
    sliders: [{ key: "i", label: "I_B", min: 0, max: 100, step: 5, value: 20, unit: "\\u00b5A", d: 0 }],
    cuts: [
    { id: "try", label: "Transistor: tap to explain", tap: (st, c) => { return "Gain about 100."; } }],
    show: (st) => `I_C = ${F(st.i * 0.1, 1)} mA`,
  });
  ctx.art.touchable(["try"]);
  return { destroy() {} };
}
