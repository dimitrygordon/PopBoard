// Jumping ring: Tap to switch rings on the AC coil.
import { calc, f2 } from "../kit.js";
const F = f2, E = (x, d = 2) => x.toExponential(d).replace(/e\+?(-?)(\d+)/, (_, s, p) => " \u00d7 10^" + (s ? "\u2212" : "") + p).replace("-", "\u2212"), R = (a) => a[Math.floor(Math.random() * a.length)];
export default function build(ctx) {
  const k = calc(ctx, {
    st: { i: 0, N: ["solid metal ring: jumps", "cut ring: no loop for current, stays", "plastic ring: no current, stays"] },
    sliders: [],
    cuts: [
    { id: "try", label: "Ring: tap for the next", tap: (st, c) => { st.i = (st.i + 1) % 3; return ""; } }],
    show: (st) => st.N[st.i],
  });
  ctx.art.touchable(["try"]);
  return { destroy() {} };
}
