// Field map: Sweep the test charge to the next spot around a positive charge.
import { calc, f2 } from "../kit.js";
const F = f2, E = (x, d = 2) => x.toExponential(d).replace(/e\+?(-?)(\d+)/, (_, s, p) => " \u00d7 10^" + (s ? "\u2212" : "") + p).replace("-", "\u2212"), R = (a) => a[Math.floor(Math.random() * a.length)];
export default function build(ctx) {
  const k = calc(ctx, {
    st: { n: 1 },
    sliders: [],
    cuts: [
    { id: "try", label: "Map: tap to add an arrow", tap: (st, c) => { st.n = st.n >= 8 ? 1 : st.n + 1; return ""; } }],
    show: (st) => `${st.n} arrow${st.n > 1 ? "s" : ""} drawn: all point away, longer near the charge\nF = Eq on any charge`,
  });
  ctx.art.touchable(["try"]);
  return { destroy() {} };
}
