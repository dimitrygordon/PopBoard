// Example Problem 1: impulse -5.7e4 N s; forces -2.7e3 N, -1.5e4 N, -2.6e5 N.
import { calc, f2 } from "../kit.js";
const F = f2, E = (x, d = 2) => x.toExponential(d).replace(/e\+?(-?)(\d+)/, (_, s, p) => " \u00d7 10^" + (s ? "\u2212" : "") + p).replace("-", "\u2212"), R = (a) => a[Math.floor(Math.random() * a.length)];
export default function build(ctx) {
  const k = calc(ctx, {
    st: { i: 0, T: [21, 3.8, 0.22], N: ["gentle braking", "slamming the brakes", "hitting a wall"] },
    sliders: [],
    cuts: [
    { id: "ex1", label: "Ex1: tap for the next stop", tap: (st, c) => { st.i = (st.i + 1) % 3; return "Same impulse every time; a shorter stop means a bigger force."; } }],
    show: (st) => `${st.N[st.i]}: \u0394t = ${st.T[st.i]} s\nimpulse \u22125.7 \u00d7 10^4 N\u00b7s, F = ${E(-57200 / st.T[st.i], 1)} N`,
  });
  ctx.art.touchable(["ex1"]);
  return { destroy() {} };
}
