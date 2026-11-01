// Branches: Tap to follow charges into the next branch (90 V, 60, 30, 20 \u03a9).
import { calc, f2 } from "../kit.js";
const F = f2, E = (x, d = 2) => x.toExponential(d).replace(/e\+?(-?)(\d+)/, (_, s, p) => " \u00d7 10^" + (s ? "\u2212" : "") + p).replace("-", "\u2212"), R = (a) => a[Math.floor(Math.random() * a.length)];
export default function build(ctx) {
  const k = calc(ctx, {
    st: { i: 0, R: [60, 30, 20] },
    sliders: [],
    cuts: [
    { id: "try", label: "Branches: tap for the next branch", tap: (st, c) => { st.i = (st.i + 1) % 3; return ""; } }],
    show: (st) => `branch ${st.i + 1} (${st.R[st.i]} \u03a9): ${F(90 / st.R[st.i], 2)} A\ntotal: 9.00 A`,
  });
  ctx.art.touchable(["try"]);
  return { destroy() {} };
}
