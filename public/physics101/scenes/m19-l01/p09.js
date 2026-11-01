// Meters: Tap to switch which meter you read on a 12 V, 4.0 \u03a9 lamp.
import { calc, f2 } from "../kit.js";
const F = f2, E = (x, d = 2) => x.toExponential(d).replace(/e\+?(-?)(\d+)/, (_, s, p) => " \u00d7 10^" + (s ? "\u2212" : "") + p).replace("-", "\u2212"), R = (a) => a[Math.floor(Math.random() * a.length)];
export default function build(ctx) {
  const k = calc(ctx, {
    st: { i: 0 },
    sliders: [],
    cuts: [
    { id: "try", label: "Meters: tap to switch", tap: (st, c) => { st.i = 1 - st.i; return ""; } }],
    show: (st) => st.i ? "ammeter in series: 3.0 A" : "voltmeter in parallel: 12 V",
  });
  ctx.art.touchable(["try"]);
  return { destroy() {} };
}
