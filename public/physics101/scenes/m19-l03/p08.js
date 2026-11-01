// Light meter: Brighten the lamp over a photoresistor (R\u2081 = 1.0 k\u03a9, 9 V).
import { calc, f2 } from "../kit.js";
const F = f2, E = (x, d = 2) => x.toExponential(d).replace(/e\+?(-?)(\d+)/, (_, s, p) => " \u00d7 10^" + (s ? "\u2212" : "") + p).replace("-", "\u2212"), R = (a) => a[Math.floor(Math.random() * a.length)];
export default function build(ctx) {
  const k = calc(ctx, {
    st: {},
    sliders: [{ key: "l", label: "Light", min: 1, max: 10, step: 1, value: 5, unit: "", d: 0 }],
    cuts: [
    { id: "try", label: "Photoresistor: tap to explain", tap: (st, c) => { return "More light, less resistance, smaller share of the voltage."; } }],
    show: (st) => `photoresistor: ${F(10 / st.l, 1)} k\u03a9\noutput: ${F(9 * (10 / st.l) / (1 + 10 / st.l), 2)} V`,
  });
  ctx.art.touchable(["try"]);
  return { destroy() {} };
}
