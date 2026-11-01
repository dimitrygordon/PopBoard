// LC: Change the capacitance (L = 1.0 mH).
import { calc, f2 } from "../kit.js";
const F = f2, E = (x, d = 2) => x.toExponential(d).replace(/e\+?(-?)(\d+)/, (_, s, p) => " \u00d7 10^" + (s ? "\u2212" : "") + p).replace("-", "\u2212"), R = (a) => a[Math.floor(Math.random() * a.length)];
export default function build(ctx) {
  const k = calc(ctx, {
    st: {},
    sliders: [{ key: "c", label: "C", min: 1, max: 1000, step: 1, value: 100, unit: "pF", d: 0 }],
    cuts: [
    { id: "try", label: "Circuit: tap to explain", tap: (st, c) => { return "f = 1/(2\u03c0\u221a(LC))."; } }],
    show: (st) => `f = ${F(1 / (2 * Math.PI * Math.sqrt(1e-3 * st.c * 1e-12)) / 1e6, 2)} MHz`,
  });
  ctx.art.touchable(["try"]);
  return { destroy() {} };
}
