// Add branch currents: Tap to read the next branch ammeter (120 V; 24, 9, 6 \u03a9).
import { calc, f2 } from "../kit.js";
const F = f2, E = (x, d = 2) => x.toExponential(d).replace(/e\+?(-?)(\d+)/, (_, s, p) => " \u00d7 10^" + (s ? "\u2212" : "") + p).replace("-", "\u2212"), R = (a) => a[Math.floor(Math.random() * a.length)];
export default function build(ctx) {
  const k = calc(ctx, {
    st: { n: 1, R: [24, 9, 6] },
    sliders: [],
    cuts: [
    { id: "try", label: "Ammeters: tap to add the next branch", tap: (st, c) => { st.n = st.n >= 3 ? 1 : st.n + 1; return st.n === 3 ? "Total: 38 A." : ""; } }],
    show: (st) => `${st.R.slice(0, st.n).map((r) => F(120 / r, 1) + " A").join(" + ")} = ${F(st.R.slice(0, st.n).reduce((s, r) => s + 120 / r, 0), 0)} A`,
  });
  ctx.art.touchable(["try"]);
  return { destroy() {} };
}
