// Cell: Change the radiation's frequency.
import { calc, f2 } from "../kit.js";
const F = f2, E = (x, d = 2) => x.toExponential(d).replace(/e\+?(-?)(\d+)/, (_, s, p) => " \u00d7 10^" + (s ? "\u2212" : "") + p).replace("-", "\u2212"), R = (a) => a[Math.floor(Math.random() * a.length)];
export default function build(ctx) {
  const k = calc(ctx, {
    st: {},
    sliders: [{ key: "n", label: "log\\u2081\\u2080 f (Hz)", min: 12, max: 20, step: 1, value: 14, unit: "", d: 0 }],
    cuts: [
    { id: "try", label: "Cell: tap to explain", tap: (st, c) => { return "High-frequency photons can ionize."; } }],
    show: (st) => st.n >= 16 ? "ionizes: can damage the cell" : "only warms it",
  });
  ctx.art.touchable(["try"]);
  return { destroy() {} };
}
