// Example Problem 6: 40 V, 2.4e-6 C gives 6.0e-8 F.
import { calc, f2 } from "../kit.js";
const F = f2, E = (x, d = 2) => x.toExponential(d).replace(/e\+?(-?)(\d+)/, (_, s, p) => " \u00d7 10^" + (s ? "\u2212" : "") + p).replace("-", "\u2212"), R = (a) => a[Math.floor(Math.random() * a.length)];
export default function build(ctx) {
  const k = calc(ctx, {
    st: {},
    sliders: [{ key: "v", label: "Battery", min: 10, max: 100, step: 10, value: 40, unit: "V", d: 0 }],
    cuts: [
    { id: "try", label: "Sphere: tap for the book's 40 V", tap: (st, c) => { st.v = 40; c.v.set(40); return "C = q/\u0394V = 6.0 \u00d7 10\u207b\u2078 F."; } }],
    show: (st) => `q = ${E(6e-8 * st.v, 1)} C\nq/\u0394V = 6.0 \u00d7 10\u207b\u2078 F`,
  });
  ctx.art.touchable(["try"]);
  return { destroy() {} };
}
