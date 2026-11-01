// Electroscope: Tap for the next action with a negative rod.
import { calc, f2 } from "../kit.js";
const F = f2, E = (x, d = 2) => x.toExponential(d).replace(/e\+?(-?)(\d+)/, (_, s, p) => " \u00d7 10^" + (s ? "\u2212" : "") + p).replace("-", "\u2212"), R = (a) => a[Math.floor(Math.random() * a.length)];
export default function build(ctx) {
  const k = calc(ctx, {
    st: { s: 0, N: ["rod far away: leaves hang down", "rod hovering near: leaves spread (charges separate)", "rod touches: charge flows on, leaves stay spread when removed"] },
    sliders: [],
    cuts: [
    { id: "try", label: "Electroscope: tap for the next action", tap: (st, c) => { st.s = (st.s + 1) % 3; return ""; } }],
    show: (st) => st.N[st.s],
  });
  ctx.art.touchable(["try"]);
  return { destroy() {} };
}
