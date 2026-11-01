// Arrows: Tap to switch the sign of charge B.
import { calc, f2 } from "../kit.js";
const F = f2, E = (x, d = 2) => x.toExponential(d).replace(/e\+?(-?)(\d+)/, (_, s, p) => " \u00d7 10^" + (s ? "\u2212" : "") + p).replace("-", "\u2212"), R = (a) => a[Math.floor(Math.random() * a.length)];
export default function build(ctx) {
  const k = calc(ctx, {
    st: { i: 0 },
    sliders: [],
    cuts: [
    { id: "try", label: "Charges: tap to flip B", tap: (st, c) => { st.i = 1 - st.i; return "Equal and opposite arrows, every time."; } }],
    show: (st) => st.i ? "A +, B +: arrows point apart (repel)" : "A +, B \u2212: arrows point toward each other (attract)",
  });
  ctx.art.touchable(["try"]);
  return { destroy() {} };
}
