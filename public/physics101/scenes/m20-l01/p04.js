// Slice: Slice the bar magnet into more pieces.
import { calc, f2 } from "../kit.js";
const F = f2, E = (x, d = 2) => x.toExponential(d).replace(/e\+?(-?)(\d+)/, (_, s, p) => " \u00d7 10^" + (s ? "\u2212" : "") + p).replace("-", "\u2212"), R = (a) => a[Math.floor(Math.random() * a.length)];
export default function build(ctx) {
  const k = calc(ctx, {
    st: {},
    sliders: [{ key: "n", label: "Pieces", min: 1, max: 8, step: 1, value: 1, unit: "", d: 0 }],
    cuts: [
    { id: "try", label: "Magnet: tap to explain", tap: (st, c) => { return "Every piece has a north and a south pole."; } }],
    show: (st) => `${st.n} piece${st.n > 1 ? "s" : ""}, ${st.n * 2} poles, no monopoles`,
  });
  ctx.art.touchable(["try"]);
  return { destroy() {} };
}
