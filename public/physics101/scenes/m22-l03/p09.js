// Sodium vapor: Tap to switch spectra.
import { calc, f2 } from "../kit.js";
const F = f2, E = (x, d = 2) => x.toExponential(d).replace(/e\+?(-?)(\d+)/, (_, s, p) => " \u00d7 10^" + (s ? "\u2212" : "") + p).replace("-", "\u2212"), R = (a) => a[Math.floor(Math.random() * a.length)];
export default function build(ctx) {
  const k = calc(ctx, {
    st: { i: 0 },
    sliders: [],
    cuts: [
    { id: "try", label: "Vapor: tap to switch", tap: (st, c) => { st.i = 1 - st.i; return "Absorbed lines line up with emitted lines."; } }],
    show: (st) => st.i ? "emission: bright lines at 589 nm" : "absorption: dark lines at 589 nm",
  });
  ctx.art.touchable(["try"]);
  return { destroy() {} };
}
