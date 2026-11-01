// Measure: Set \u03bb, L, and w.
import { calc, f2 } from "../kit.js";
const F = f2, E = (x, d = 2) => x.toExponential(d).replace(/e\+?(-?)(\d+)/, (_, s, p) => " \u00d7 10^" + (s ? "\u2212" : "") + p).replace("-", "\u2212"), R = (a) => a[Math.floor(Math.random() * a.length)];
export default function build(ctx) {
  const k = calc(ctx, {
    st: {},
    sliders: [{ key: "l", label: "\\u03bb", min: 400, max: 700, step: 10, value: 550, unit: "nm", d: 0 }, { key: "L", label: "L", min: 0.5, max: 3, step: 0.1, value: 1.5, unit: "m", d: 1 }, { key: "w", label: "w", min: 0.05, max: 0.5, step: 0.01, value: 0.1, unit: "mm", d: 2 }],
    cuts: [
    { id: "try", label: "Screen: tap to explain", tap: (st, c) => { return "The measured band matches 2\u03bbL/w."; } }],
    show: (st) => `central band = ${F(2 * st.l * 1e-9 * st.L / (st.w * 1e-3) * 1000, 1)} mm`,
  });
  ctx.art.touchable(["try"]);
  return { destroy() {} };
}
