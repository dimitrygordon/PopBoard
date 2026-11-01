// Shunt: Pick a shunt for a 100 \u00b5A, 500 \u03a9 galvanometer.
import { calc, f2 } from "../kit.js";
const F = f2, E = (x, d = 2) => x.toExponential(d).replace(/e\+?(-?)(\d+)/, (_, s, p) => " \u00d7 10^" + (s ? "\u2212" : "") + p).replace("-", "\u2212"), R = (a) => a[Math.floor(Math.random() * a.length)];
export default function build(ctx) {
  const k = calc(ctx, {
    st: {},
    sliders: [{ key: "r", label: "Shunt", min: 0.01, max: 1, step: 0.01, value: 0.05, unit: "\\u03a9", d: 2 }],
    cuts: [
    { id: "try", label: "Shunt: tap to explain", tap: (st, c) => { return "Small shunt, most current bypasses: bigger range."; } }],
    show: (st) => `full-scale range = ${F(1e-4 * (500 + st.r) / st.r, 2)} A`,
  });
  ctx.art.touchable(["try"]);
  return { destroy() {} };
}
