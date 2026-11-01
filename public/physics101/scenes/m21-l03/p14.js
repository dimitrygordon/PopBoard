// Example Problem 4: 53 mm gives 20 proton masses.
import { calc, f2 } from "../kit.js";
const F = f2, E = (x, d = 2) => x.toExponential(d).replace(/e\+?(-?)(\d+)/, (_, s, p) => " \u00d7 10^" + (s ? "\u2212" : "") + p).replace("-", "\u2212"), R = (a) => a[Math.floor(Math.random() * a.length)];
export default function build(ctx) {
  const k = calc(ctx, {
    st: {},
    sliders: [{ key: "r", label: "r", min: 40, max: 70, step: 0.5, value: 53, unit: "mm", d: 1 }],
    cuts: [
    { id: "try", label: "Result: tap for the book's 53 mm", tap: (st, c) => { st.r = 53; c.r.set(53); return "m \u2248 3.3 \u00d7 10\u207b\u00b2\u2076 kg, about 20 proton masses."; } }],
    show: (st) => (() => { const m = 2 * 1.602e-19 * 0.0025 * (st.r / 1000) ** 2 / 68; return `m = ${E(m, 2)} kg\n= ${F(m / 1.67e-27, 1)} proton masses`; })(),
  });
  ctx.art.touchable(["try"]);
  return { destroy() {} };
}
