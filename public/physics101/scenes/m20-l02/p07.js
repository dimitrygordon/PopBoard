// Example Problem 1: 0.20 N gives 0.40 T.
import { calc, f2 } from "../kit.js";
const F = f2, E = (x, d = 2) => x.toExponential(d).replace(/e\+?(-?)(\d+)/, (_, s, p) => " \u00d7 10^" + (s ? "\u2212" : "") + p).replace("-", "\u2212"), R = (a) => a[Math.floor(Math.random() * a.length)];
export default function build(ctx) {
  const k = calc(ctx, {
    st: {},
    sliders: [{ key: "b", label: "B", min: 0.1, max: 1, step: 0.05, value: 0.4, unit: "T", d: 2 }],
    cuts: [
    { id: "try", label: "Force: tap for the book's answer", tap: (st, c) => { st.b = 0.4; c.b.set(0.4); return "B = F/IL = 0.40 T."; } }],
    show: (st) => `F = ILB = ${F(0.5 * st.b, 2)} N`,
  });
  ctx.art.touchable(["try"]);
  return { destroy() {} };
}
