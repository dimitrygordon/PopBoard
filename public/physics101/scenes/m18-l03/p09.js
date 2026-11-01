// Field lines: Tap to drop the next arrangement of charges.
import { calc, f2 } from "../kit.js";
const F = f2, E = (x, d = 2) => x.toExponential(d).replace(/e\+?(-?)(\d+)/, (_, s, p) => " \u00d7 10^" + (s ? "\u2212" : "") + p).replace("-", "\u2212"), R = (a) => a[Math.floor(Math.random() * a.length)];
export default function build(ctx) {
  const k = calc(ctx, {
    st: { i: 0, N: ["one +: lines point straight out", "one \u2212: lines point straight in", "+ and \u2212: lines curve from + to \u2212", "+ and +: lines bend away from each other"] },
    sliders: [],
    cuts: [
    { id: "try", label: "Grid: tap for the next arrangement", tap: (st, c) => { st.i = (st.i + 1) % 4; return ""; } }],
    show: (st) => st.N[st.i],
  });
  ctx.art.touchable(["try"]);
  return { destroy() {} };
}
