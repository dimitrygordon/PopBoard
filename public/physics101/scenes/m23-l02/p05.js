// Curve: Sweep the voltage.
import { calc, f2 } from "../kit.js";
const F = f2, E = (x, d = 2) => x.toExponential(d).replace(/e\+?(-?)(\d+)/, (_, s, p) => " \u00d7 10^" + (s ? "\u2212" : "") + p).replace("-", "\u2212"), R = (a) => a[Math.floor(Math.random() * a.length)];
export default function build(ctx) {
  const k = calc(ctx, {
    st: {},
    sliders: [{ key: "v", label: "\\u0394V", min: -3, max: 1, step: 0.05, value: 0, unit: "V", d: 2 }],
    cuts: [
    { id: "try", label: "Graph: tap to explain", tap: (st, c) => { return "On near 0.6 V."; } }],
    show: (st) => `I = ${st.v < 0.5 ? "\u2248 0" : F(1e-9 * Math.exp(st.v / 0.026) * 1000, 1) + " mA"}`,
  });
  ctx.art.touchable(["try"]);
  return { destroy() {} };
}
