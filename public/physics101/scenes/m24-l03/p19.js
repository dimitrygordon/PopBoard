// Rules: Tap for the next proposed reaction.
import { calc, f2 } from "../kit.js";
const F = f2, E = (x, d = 2) => x.toExponential(d).replace(/e\+?(-?)(\d+)/, (_, s, p) => " \u00d7 10^" + (s ? "\u2212" : "") + p).replace("-", "\u2212"), R = (a) => a[Math.floor(Math.random() * a.length)];
export default function build(ctx) {
  const k = calc(ctx, {
    st: { i: 0, N: ["\u03b3 \u2192 e\u207b + e\u207a: pass", "\u03b3 \u2192 e\u207b + e\u207b: fail (charge)", "\u03b3 \u2192 e\u207b + p: fail (pairing)"] },
    sliders: [],
    cuts: [
    { id: "try", label: "Reaction: tap for the next", tap: (st, c) => { st.i = (st.i + 1) % 3; return ""; } }],
    show: (st) => st.N[st.i],
  });
  ctx.art.touchable(["try"]);
  return { destroy() {} };
}
