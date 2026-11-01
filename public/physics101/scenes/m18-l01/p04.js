// Tape strips: Tap to peel two strips off the desk and bring them together.
import { calc, f2 } from "../kit.js";
const F = f2, E = (x, d = 2) => x.toExponential(d).replace(/e\+?(-?)(\d+)/, (_, s, p) => " \u00d7 10^" + (s ? "\u2212" : "") + p).replace("-", "\u2212"), R = (a) => a[Math.floor(Math.random() * a.length)];
export default function build(ctx) {
  const k = calc(ctx, {
    st: { n: 0 },
    sliders: [],
    cuts: [
    { id: "try", label: "Strips: tap to bring them together", tap: (st, c) => { st.n++; return "Like charges repel."; } }],
    show: (st) => "both strips have the same kind of charge: they push apart",
  });
  ctx.art.touchable(["try"]);
  return { destroy() {} };
}
