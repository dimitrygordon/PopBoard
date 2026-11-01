// Collapse: Tap to collapse the next group.
import { calc, f2 } from "../kit.js";
const F = f2, E = (x, d = 2) => x.toExponential(d).replace(/e\+?(-?)(\d+)/, (_, s, p) => " \u00d7 10^" + (s ? "\u2212" : "") + p).replace("-", "\u2212"), R = (a) => a[Math.floor(Math.random() * a.length)];
export default function build(ctx) {
  const k = calc(ctx, {
    st: { s: 0, N: ["6 \u03a9 \u2225 3 \u03a9 \u2192 2 \u03a9", "2 \u03a9 + 4 \u03a9 in series \u2192 6 \u03a9", "6 \u03a9 \u2225 6 \u03a9 \u2192 3 \u03a9: one resistor"] },
    sliders: [],
    cuts: [
    { id: "try", label: "Circuit: tap for the next step", tap: (st, c) => { st.s = (st.s + 1) % 3; return ""; } }],
    show: (st) => st.N[st.s],
  });
  ctx.art.touchable(["try"]);
  return { destroy() {} };
}
