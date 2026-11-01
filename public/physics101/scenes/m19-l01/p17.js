// Swap meters: Tap to swap the voltmeter and the ammeter.
import { calc, f2 } from "../kit.js";
const F = f2, E = (x, d = 2) => x.toExponential(d).replace(/e\+?(-?)(\d+)/, (_, s, p) => " \u00d7 10^" + (s ? "\u2212" : "") + p).replace("-", "\u2212"), R = (a) => a[Math.floor(Math.random() * a.length)];
export default function build(ctx) {
  const k = calc(ctx, {
    st: { i: 0 },
    sliders: [],
    cuts: [
    { id: "try", label: "Meters: tap to swap", tap: (st, c) => { st.i = 1 - st.i; return ""; } }],
    show: (st) => st.i ? "swapped: the ammeter shorts the lamp; the voltmeter blocks the current" : "voltmeter in parallel, ammeter in series: correct readings",
  });
  ctx.art.touchable(["try"]);
  return { destroy() {} };
}
