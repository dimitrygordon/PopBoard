// Example Problem 1: 56 N, 18 cm: k 310 N/m, PE 5.0 J.
import { calc, f2 } from "../kit.js";
const F = f2, E = (x, d = 2) => x.toExponential(d).replace(/e\+?(-?)(\d+)/, (_, s, p) => " \u00d7 10^" + (s ? "\u2212" : "") + p).replace("-", "\u2212"), R = (a) => a[Math.floor(Math.random() * a.length)];
export default function build(ctx) {
  const k = calc(ctx, {
    st: {},
    sliders: [{ key: "w", label: "Bag weight", min: 10, max: 100, step: 1, value: 56, unit: "N", d: 0 }],
    cuts: [
    { id: "bags", label: "k and PE: tap for the book's bag", tap: (st, c) => { st.w = 56; c.w.set(56); return "k = 310 N/m, PE = 5.0 J."; } }],
    show: (st) => `x = ${F(st.w / 310 * 100, 0)} cm\nPE = \u00bdkx\u00b2 = ${F(st.w * st.w / 620, 1)} J`,
  });
  ctx.art.touchable(["bags"]);
  return { destroy() {} };
}
