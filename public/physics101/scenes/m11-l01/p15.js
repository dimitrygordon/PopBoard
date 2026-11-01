// Example Problem 2: C_A = 4.5e2 J/(kg K): iron.
import { calc, f2 } from "../kit.js";
const F = f2, E = (x, d = 2) => x.toExponential(d).replace(/e\+?(-?)(\d+)/, (_, s, p) => " \u00d7 10^" + (s ? "\u2212" : "") + p).replace("-", "\u2212"), R = (a) => a[Math.floor(Math.random() * a.length)];
export default function build(ctx) {
  const k = calc(ctx, {
    st: { i: 0, N: ["iron", "aluminum", "copper", "lead"], C: [450, 897, 385, 130] },
    sliders: [],
    cuts: [
    { id: "ex2", label: "Final temperature: tap for another metal", tap: (st, c) => { st.i = (st.i + 1) % 4; return st.i ? "" : "The book's block had C = 4.5 \u00d7 10\u00b2 J/(kg\u00b7K): iron, T_f = 16 \u00b0C."; } }],
    show: (st) => `${st.N[st.i]} (C = ${st.C[st.i]}): T_f = ${F((0.1 * st.C[st.i] * 62 + 0.5 * 4180 * 15) / (0.1 * st.C[st.i] + 2090), 1)} \u00b0C`,
  });
  ctx.art.touchable(["ex2"]);
  return { destroy() {} };
}
