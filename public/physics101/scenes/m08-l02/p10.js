// I = 2 m r^2 for two 5.0 g coins (pencil mass ignored); alpha = tau / I with tau = 0.0010 N m (sandbox).
import { calc, f2 } from "../kit.js";
const F = f2, E = (x, d = 2) => x.toExponential(d).replace(/e\+?(-?)(\d+)/, (_, s, p) => " \u00d7 10^" + (s ? "\u2212" : "") + p).replace("-", "\u2212"), R = (a) => a[Math.floor(Math.random() * a.length)];
export default function build(ctx) {
  const k = calc(ctx, {
    st: {},
    sliders: [{ key: "r", label: "Coin distance", min: 0.01, max: 0.09, step: 0.01, value: 0.03, unit: "m", d: 2 }],
    cuts: [
    { id: "slide", label: "Slide: tap to wiggle", tap: (st, c) => { return st.r > 0.06 ? "Coins far out: the pencil is sluggish." : "Coins near the middle: it wiggles easily."; } }],
    show: (st) => `I = 2mr\u00b2 = ${E(2 * 0.005 * st.r ** 2)} kg\u00b7m\u00b2\n\u03b1 = \u03c4/I = ${F(0.001 / (2 * 0.005 * st.r ** 2), 0)} rad/s\u00b2`,
  });
  ctx.art.touchable(["slide"]);
  return { destroy() {} };
}
