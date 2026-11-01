// Wave theory fails: Tap to run both.
import { calc, f2 } from "../kit.js";
const F = f2, E = (x, d = 2) => x.toExponential(d).replace(/e\+?(-?)(\d+)/, (_, s, p) => " \u00d7 10^" + (s ? "\u2212" : "") + p).replace("-", "\u2212"), R = (a) => a[Math.floor(Math.random() * a.length)];
export default function build(ctx) {
  const k = calc(ctx, {
    st: { s: 0 },
    sliders: [],
    cuts: [
    { id: "try", label: "Sims: tap to run", tap: (st, c) => { st.s = 1; return ""; } }],
    show: (st) => st.s ? "wave theory: electrons out after a delay\nreal photocell: nothing, ever" : "dim red light ready",
  });
  ctx.art.touchable(["try"]);
  return { destroy() {} };
}
