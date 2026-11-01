// Example Problem 3: -4.0 uC at 0.30 m gives 4.0e5 N/C toward the sphere.
import { calc, f2 } from "../kit.js";
const F = f2, E = (x, d = 2) => x.toExponential(d).replace(/e\+?(-?)(\d+)/, (_, s, p) => " \u00d7 10^" + (s ? "\u2212" : "") + p).replace("-", "\u2212"), R = (a) => a[Math.floor(Math.random() * a.length)];
export default function build(ctx) {
  const k = calc(ctx, {
    st: {},
    sliders: [{ key: "q", label: "q", min: -8, max: 8, step: 0.5, value: -4, unit: "\\u00b5C", d: 1 }],
    cuts: [
    { id: "try", label: "Arrow: tap for the book's \\u22124.0 \\u00b5C", tap: (st, c) => { st.q = -4; c.q.set(-4); return "E = 4.0 \u00d7 10\u2075 N/C toward the sphere."; } }],
    show: (st) => st.q === 0 ? "E = 0" : `E = ${E(9e9 * Math.abs(st.q) * 1e-6 / 0.09, 1)} N/C, ${st.q < 0 ? "toward" : "away from"} the sphere`,
  });
  ctx.art.touchable(["try"]);
  return { destroy() {} };
}
