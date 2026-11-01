// Float a drop: Adjust the voltage on plates 1.2 cm apart for a 2.4 \u00d7 10\u207b\u00b9\u2074 N drop.
import { calc, f2 } from "../kit.js";
const F = f2, E = (x, d = 2) => x.toExponential(d).replace(/e\+?(-?)(\d+)/, (_, s, p) => " \u00d7 10^" + (s ? "\u2212" : "") + p).replace("-", "\u2212"), R = (a) => a[Math.floor(Math.random() * a.length)];
export default function build(ctx) {
  const k = calc(ctx, {
    st: {},
    sliders: [{ key: "v", label: "\\u0394V", min: 100, max: 1000, step: 5, value: 450, unit: "V", d: 0 }],
    cuts: [
    { id: "try", label: "Drop: tap to explain", tap: (st, c) => { return "Only voltages that match a whole number of e balance it."; } }],
    show: (st) => (() => { const n = 2.4e-14 * 0.012 / st.v / 1.602e-19; return Math.abs(n - Math.round(n)) < 0.05 ? `floats: ${Math.round(n)} extra electrons` : "drifts"; })(),
  });
  ctx.art.touchable(["try"]);
  return { destroy() {} };
}
