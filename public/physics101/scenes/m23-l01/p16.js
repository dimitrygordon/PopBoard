// Thermistor: Change the temperature.
import { calc, f2 } from "../kit.js";
const F = f2, E = (x, d = 2) => x.toExponential(d).replace(/e\+?(-?)(\d+)/, (_, s, p) => " \u00d7 10^" + (s ? "\u2212" : "") + p).replace("-", "\u2212"), R = (a) => a[Math.floor(Math.random() * a.length)];
export default function build(ctx) {
  const k = calc(ctx, {
    st: {},
    sliders: [{ key: "t", label: "T", min: 0, max: 100, step: 5, value: 25, unit: "\\u00b0C", d: 0 }],
    cuts: [
    { id: "try", label: "Circuit: tap to explain", tap: (st, c) => { return "Warmer: more carriers, less resistance."; } }],
    show: (st) => (() => { const r = 10 * Math.exp(3950 * (1 / (st.t + 273) - 1 / 298)); return `R = ${F(r, 2)} k\u03a9, I = ${F(5 / r, 2)} mA`; })(),
  });
  ctx.art.touchable(["try"]);
  return { destroy() {} };
}
