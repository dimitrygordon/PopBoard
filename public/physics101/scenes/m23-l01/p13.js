// Arsenic: Tap to swap in arsenic.
import { calc, f2 } from "../kit.js";
const F = f2, E = (x, d = 2) => x.toExponential(d).replace(/e\+?(-?)(\d+)/, (_, s, p) => " \u00d7 10^" + (s ? "\u2212" : "") + p).replace("-", "\u2212"), R = (a) => a[Math.floor(Math.random() * a.length)];
export default function build(ctx) {
  const k = calc(ctx, {
    st: { a: 0 },
    sliders: [],
    cuts: [
    { id: "try", label: "Atom: tap to swap", tap: (st, c) => { st.a = 1 - st.a; return ""; } }],
    show: (st) => st.a ? "arsenic: 5th electron jumps to the conduction band (n-type)" : "pure silicon",
  });
  ctx.art.touchable(["try"]);
  return { destroy() {} };
}
