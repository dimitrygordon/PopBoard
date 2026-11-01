// Drops: Tap to measure the next drop.
import { calc, f2 } from "../kit.js";
const F = f2, E = (x, d = 2) => x.toExponential(d).replace(/e\+?(-?)(\d+)/, (_, s, p) => " \u00d7 10^" + (s ? "\u2212" : "") + p).replace("-", "\u2212"), R = (a) => a[Math.floor(Math.random() * a.length)];
export default function build(ctx) {
  const k = calc(ctx, {
    st: { i: 0, Q: [3.2, 4.8, 8.0, 1.6, 6.4] },
    sliders: [],
    cuts: [
    { id: "try", label: "Plot: tap for the next drop", tap: (st, c) => { st.i = (st.i + 1) % 5; return ""; } }],
    show: (st) => `q = ${st.Q[st.i]} \u00d7 10\u207b\u00b9\u2079 C = ${F(st.Q[st.i] / 1.6, 0)}e`,
  });
  ctx.art.touchable(["try"]);
  return { destroy() {} };
}
