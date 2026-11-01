// Example Problem 1: 8.45e22 per cm3.
import { calc, f2 } from "../kit.js";
const F = f2, E = (x, d = 2) => x.toExponential(d).replace(/e\+?(-?)(\d+)/, (_, s, p) => " \u00d7 10^" + (s ? "\u2212" : "") + p).replace("-", "\u2212"), R = (a) => a[Math.floor(Math.random() * a.length)];
export default function build(ctx) {
  const k = calc(ctx, {
    st: {},
    sliders: [{ key: "n", label: "Free e\\u207b per atom", min: 1, max: 3, step: 1, value: 1, unit: "", d: 0 }],
    cuts: [
    { id: "try", label: "Result: tap for copper's value", tap: (st, c) => { st.n = 1; c.n.set(1); return "8.45 \u00d7 10\u00b2\u00b2 free electrons per cm\u00b3."; } }],
    show: (st) => `${E(st.n * 6.02e23 / 63.55 * 8.92, 3)} free e\u207b/cm\u00b3`,
  });
  ctx.art.touchable(["try"]);
  return { destroy() {} };
}
