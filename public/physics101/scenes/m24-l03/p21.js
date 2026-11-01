// W boson: Tap to switch the boson.
import { calc, f2 } from "../kit.js";
const F = f2, E = (x, d = 2) => x.toExponential(d).replace(/e\+?(-?)(\d+)/, (_, s, p) => " \u00d7 10^" + (s ? "\u2212" : "") + p).replace("-", "\u2212"), R = (a) => a[Math.floor(Math.random() * a.length)];
export default function build(ctx) {
  const k = calc(ctx, {
    st: { i: 0 },
    sliders: [],
    cuts: [
    { id: "try", label: "Quark: tap to switch", tap: (st, c) => { st.i = 1 - st.i; return ""; } }],
    show: (st) => st.i ? "W\u207a: charge doesn't balance" : "d \u2192 u + W\u207b: balanced",
  });
  ctx.art.touchable(["try"]);
  return { destroy() {} };
}
