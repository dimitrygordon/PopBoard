// Medium: Tap to switch media.
import { calc, f2 } from "../kit.js";
const F = f2, E = (x, d = 2) => x.toExponential(d).replace(/e\+?(-?)(\d+)/, (_, s, p) => " \u00d7 10^" + (s ? "\u2212" : "") + p).replace("-", "\u2212"), R = (a) => a[Math.floor(Math.random() * a.length)];
export default function build(ctx) {
  const k = calc(ctx, {
    st: { i: 0, N: ["air", "water", "glass"], K: [1.0, 1.77, 2.31] },
    sliders: [],
    cuts: [
    { id: "try", label: "Medium: tap for the next", tap: (st, c) => { st.i = (st.i + 1) % 3; return ""; } }],
    show: (st) => `${st.N[st.i]}: K = ${st.K[st.i]}, v = c/\u221aK = ${E(3e8 / Math.sqrt(st.K[st.i]), 2)} m/s`,
  });
  ctx.art.touchable(["try"]);
  return { destroy() {} };
}
