// Pairs: Tap to pick the next pair of points across the slit.
import { calc, f2 } from "../kit.js";
const F = f2, E = (x, d = 2) => x.toExponential(d).replace(/e\+?(-?)(\d+)/, (_, s, p) => " \u00d7 10^" + (s ? "\u2212" : "") + p).replace("-", "\u2212"), R = (a) => a[Math.floor(Math.random() * a.length)];
export default function build(ctx) {
  const k = calc(ctx, {
    st: { i: 0, N: ["top edge + middle", "a quarter down + three quarters down", "middle + bottom edge"] },
    sliders: [],
    cuts: [
    { id: "try", label: "Slit: tap for the next pair", tap: (st, c) => { st.i = (st.i + 1) % 3; return "Half a slit-width apart: their paths differ by \u03bb/2 at the first dark band, so they cancel."; } }],
    show: (st) => `pair: ${st.N[st.i]}\nthey cancel at sin\u03b8 = \u03bb/w`,
  });
  ctx.art.touchable(["try"]);
  return { destroy() {} };
}
