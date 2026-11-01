// Example Problem 3: 2.0e7 m/s gives 3.2e-2 m.
import { calc, f2 } from "../kit.js";
const F = f2, E = (x, d = 2) => x.toExponential(d).replace(/e\+?(-?)(\d+)/, (_, s, p) => " \u00d7 10^" + (s ? "\u2212" : "") + p).replace("-", "\u2212"), R = (a) => a[Math.floor(Math.random() * a.length)];
export default function build(ctx) {
  const k = calc(ctx, {
    st: {},
    sliders: [{ key: "v", label: "v", min: 0.5, max: 5, step: 0.1, value: 2, unit: "\\u00d7 10\\u2077 m/s", d: 1 }],
    cuts: [
    { id: "try", label: "Circle: tap for the book's speed", tap: (st, c) => { st.v = 2; c.v.set(2); return "r = 3.2 \u00d7 10\u207b\u00b2 m."; } }],
    show: (st) => `r = mv/Bq = ${F(9.11e-31 * st.v * 1e7 / (3.5e-3 * 1.602e-19) * 100, 1)} cm`,
  });
  ctx.art.touchable(["try"]);
  return { destroy() {} };
}
