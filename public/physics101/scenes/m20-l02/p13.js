// Example Problem 2: 3.0e6 m/s gives 1.9e-14 N.
import { calc, f2 } from "../kit.js";
const F = f2, E = (x, d = 2) => x.toExponential(d).replace(/e\+?(-?)(\d+)/, (_, s, p) => " \u00d7 10^" + (s ? "\u2212" : "") + p).replace("-", "\u2212"), R = (a) => a[Math.floor(Math.random() * a.length)];
export default function build(ctx) {
  const k = calc(ctx, {
    st: {},
    sliders: [{ key: "v", label: "v", min: 1, max: 10, step: 0.1, value: 3, unit: "\\u00d7 10\\u2076 m/s", d: 1 }],
    cuts: [
    { id: "try", label: "Beam: tap for the book's speed", tap: (st, c) => { st.v = 3; c.v.set(3); return "F = \u22121.9 \u00d7 10\u207b\u00b9\u2074 N."; } }],
    show: (st) => `F = qvB = \u2212${E(1.602e-19 * st.v * 1e6 * 0.04, 1)} N`,
  });
  ctx.art.touchable(["try"]);
  return { destroy() {} };
}
