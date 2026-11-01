// Example Problem 5: A is 0.60 m from one end (0.30 m from the CM). B at 0.15 m from the other end gives F_B = 16 N, F_A = 41 N.
import { calc, f2 } from "../kit.js";
const F = f2, E = (x, d = 2) => x.toExponential(d).replace(/e\+?(-?)(\d+)/, (_, s, p) => " \u00d7 10^" + (s ? "\u2212" : "") + p).replace("-", "\u2212"), R = (a) => a[Math.floor(Math.random() * a.length)];
export default function build(ctx) {
  const k = calc(ctx, {
    st: {},
    sliders: [{ key: "b", label: "B from the far end", min: 0, max: 0.8, step: 0.05, value: 0.15, unit: "m", d: 2 }],
    cuts: [
    { id: "ex5", label: "Ex5: tap for the book's position", tap: (st, c) => { st.b = 0.15; c.b.set(0.15); return "F_B = 16 N and F_A = 41 N, adding up to the 57 N weight."; } }],
    show: (st) => (() => { const W = 5.8 * 9.8, rB = 1.8 - st.b - 0.6, FB = W * 0.3 / rB; return `F_B = ${F(FB, 0)} N   F_A = ${F(W - FB, 0)} N (weight ${F(W, 0)} N)`; })(),
  });
  ctx.art.touchable(["ex5"]);
  return { destroy() {} };
}
