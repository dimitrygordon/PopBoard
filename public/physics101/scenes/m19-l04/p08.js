// Ammeter: Change the ammeter's resistance in a 12 V, 10 \u03a9 circuit.
import { calc, f2 } from "../kit.js";
const F = f2, E = (x, d = 2) => x.toExponential(d).replace(/e\+?(-?)(\d+)/, (_, s, p) => " \u00d7 10^" + (s ? "\u2212" : "") + p).replace("-", "\u2212"), R = (a) => a[Math.floor(Math.random() * a.length)];
export default function build(ctx) {
  const k = calc(ctx, {
    st: {},
    sliders: [{ key: "r", label: "Ammeter R", min: 0.01, max: 5, step: 0.01, value: 0.1, unit: "\\u03a9", d: 2 }],
    cuts: [
    { id: "try", label: "Ammeter: tap to explain", tap: (st, c) => { return "A good ammeter has very low resistance."; } }],
    show: (st) => `true I = 1.20 A, measured ${F(12 / (10 + st.r), 3)} A`,
  });
  ctx.art.touchable(["try"]);
  return { destroy() {} };
}
