// Example Problem 2: 2.90e-13 per atom.
import { calc, f2 } from "../kit.js";
const F = f2, E = (x, d = 2) => x.toExponential(d).replace(/e\+?(-?)(\d+)/, (_, s, p) => " \u00d7 10^" + (s ? "\u2212" : "") + p).replace("-", "\u2212"), R = (a) => a[Math.floor(Math.random() * a.length)];
export default function build(ctx) {
  const k = calc(ctx, {
    st: {},
    sliders: [{ key: "t", label: "T", min: 250, max: 400, step: 5, value: 300, unit: "K", d: 0 }],
    cuts: [
    { id: "try", label: "Result: tap for the book's 300 K", tap: (st, c) => { st.t = 300; c.t.set(300); return "2.90 \u00d7 10\u207b\u00b9\u00b3 free electrons per atom."; } }],
    show: (st) => `${E(2.90e-13 * (st.t / 300) ** 1.5 * Math.exp(-1.12 / (2 * 8.617e-5) * (1 / st.t - 1 / 300)), 2)} free e\u207b per atom`,
  });
  ctx.art.touchable(["try"]);
  return { destroy() {} };
}
