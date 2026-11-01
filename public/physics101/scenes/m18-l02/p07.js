// Grounding: Tap to run the steps; then tap again to try the wrong order.
import { calc, f2 } from "../kit.js";
const F = f2, E = (x, d = 2) => x.toExponential(d).replace(/e\+?(-?)(\d+)/, (_, s, p) => " \u00d7 10^" + (s ? "\u2212" : "") + p).replace("-", "\u2212"), R = (a) => a[Math.floor(Math.random() * a.length)];
export default function build(ctx) {
  const k = calc(ctx, {
    st: { s: 0, N: ["rod near, ground connected, remove ground, remove rod: sphere is charged", "rod near, ground connected, remove rod first, then ground: sphere is neutral again"] },
    sliders: [],
    cuts: [
    { id: "try", label: "Steps: tap to switch orders", tap: (st, c) => { st.s = 1 - st.s; return ""; } }],
    show: (st) => st.N[st.s],
  });
  ctx.art.touchable(["try"]);
  return { destroy() {} };
}
