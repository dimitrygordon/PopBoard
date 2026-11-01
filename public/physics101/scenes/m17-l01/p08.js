// x = \u03bbL/d: Adjust d, L, and \u03bb and watch the first-order band move.
import { calc, f2 } from "../kit.js";
const F = f2, E = (x, d = 2) => x.toExponential(d).replace(/e\+?(-?)(\d+)/, (_, s, p) => " \u00d7 10^" + (s ? "\u2212" : "") + p).replace("-", "\u2212"), R = (a) => a[Math.floor(Math.random() * a.length)];
export default function build(ctx) {
  const k = calc(ctx, {
    st: {},
    sliders: [{ key: "l", label: "\\u03bb", min: 400, max: 700, step: 10, value: 600, unit: "nm", d: 0 }, { key: "L", label: "L", min: 0.5, max: 2, step: 0.1, value: 1, unit: "m", d: 1 }, { key: "d", label: "d", min: 0.01, max: 0.1, step: 0.005, value: 0.02, unit: "mm", d: 3 }],
    cuts: [
    { id: "try", label: "Band: tap to explain", tap: (st, c) => { return "xd/L always equals \u03bb."; } }],
    show: (st) => `x = \u03bbL/d = ${F(st.l * 1e-9 * st.L / (st.d * 1e-3) * 1000, 1)} mm\nxd/L = ${st.l} nm`,
  });
  ctx.art.touchable(["try"]);
  return { destroy() {} };
}
