// Example Problem 1: 4.50 N over 0.150 m: 0.675 J.
import { calc, f2 } from "../kit.js";
const F = f2, E = (x, d = 2) => x.toExponential(d).replace(/e\+?(-?)(\d+)/, (_, s, p) => " \u00d7 10^" + (s ? "\u2212" : "") + p).replace("-", "\u2212"), R = (a) => a[Math.floor(Math.random() * a.length)];
export default function build(ctx) {
  const k = calc(ctx, {
    st: {},
    sliders: [{ key: "F", label: "Force", min: 1, max: 10, step: 0.5, value: 4.5, unit: "N", d: 1 }, { key: "d", label: "Distance", min: 0.05, max: 0.3, step: 0.025, value: 0.15, unit: "m", d: 3 }],
    cuts: [
    { id: "ex1", label: "Ex1: tap for the book's values", tap: (st, c) => { st.F = 4.5; st.d = 0.15; c.F.set(4.5); c.d.set(0.15); return "0.675 J. The mass did not matter."; } }],
    show: (st) => `W = Fd cos 0\u00b0 = ${F(st.F, 2)} \u00d7 ${F(st.d, 3)} = ${F(st.F * st.d, 3)} J`,
  });
  ctx.art.touchable(["ex1"]);
  return { destroy() {} };
}
