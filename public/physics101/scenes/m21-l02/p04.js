// Magnet and coil: Tap to try the next move.
import { calc, f2 } from "../kit.js";
const F = f2, E = (x, d = 2) => x.toExponential(d).replace(/e\+?(-?)(\d+)/, (_, s, p) => " \u00d7 10^" + (s ? "\u2212" : "") + p).replace("-", "\u2212"), R = (a) => a[Math.floor(Math.random() * a.length)];
export default function build(ctx) {
  const k = calc(ctx, {
    st: { i: 0, N: ["N pushed in: coil's near end becomes N, repels", "N pulled out: near end becomes S, attracts", "S pushed in: near end becomes S, repels", "S pulled out: near end becomes N, attracts"] },
    sliders: [],
    cuts: [
    { id: "try", label: "Coil: tap for the next move", tap: (st, c) => { st.i = (st.i + 1) % 4; return ""; } }],
    show: (st) => st.N[st.i],
  });
  ctx.art.touchable(["try"]);
  return { destroy() {} };
}
