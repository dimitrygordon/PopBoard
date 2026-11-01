// Commutator: Tap to add or remove the split-ring commutator.
import { calc, f2 } from "../kit.js";
const F = f2, E = (x, d = 2) => x.toExponential(d).replace(/e\+?(-?)(\d+)/, (_, s, p) => " \u00d7 10^" + (s ? "\u2212" : "") + p).replace("-", "\u2212"), R = (a) => a[Math.floor(Math.random() * a.length)];
export default function build(ctx) {
  const k = calc(ctx, {
    st: { c: 1 },
    sliders: [],
    cuts: [
    { id: "try", label: "Motor: tap to toggle", tap: (st, c) => { st.c = 1 - st.c; return ""; } }],
    show: (st) => st.c ? "commutator reverses the current each half turn: it keeps spinning" : "no commutator: the loop rocks and stalls",
  });
  ctx.art.touchable(["try"]);
  return { destroy() {} };
}
