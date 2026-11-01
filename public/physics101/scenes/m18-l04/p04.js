// Paths: Tap to try another path from A to B.
import { calc, f2 } from "../kit.js";
const F = f2, E = (x, d = 2) => x.toExponential(d).replace(/e\+?(-?)(\d+)/, (_, s, p) => " \u00d7 10^" + (s ? "\u2212" : "") + p).replace("-", "\u2212"), R = (a) => a[Math.floor(Math.random() * a.length)];
export default function build(ctx) {
  const k = calc(ctx, {
    st: { i: 0, N: ["straight", "curvy", "the long way around"] },
    sliders: [],
    cuts: [
    { id: "try", label: "Path: tap for the next one", tap: (st, c) => { st.i = (st.i + 1) % 3; return ""; } }],
    show: (st) => `${st.N[st.i]} path: \u0394V = 12 V`,
  });
  ctx.art.touchable(["try"]);
  return { destroy() {} };
}
