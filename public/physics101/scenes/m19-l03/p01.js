// River: Split the river into more channels.
import { calc, f2 } from "../kit.js";
const F = f2, E = (x, d = 2) => x.toExponential(d).replace(/e\+?(-?)(\d+)/, (_, s, p) => " \u00d7 10^" + (s ? "\u2212" : "") + p).replace("-", "\u2212"), R = (a) => a[Math.floor(Math.random() * a.length)];
export default function build(ctx) {
  const k = calc(ctx, {
    st: {},
    sliders: [{ key: "n", label: "Channels", min: 1, max: 5, step: 1, value: 1, unit: "", d: 0 }],
    cuts: [
    { id: "try", label: "River: tap to explain", tap: (st, c) => { return "Total flow and total drop stay the same."; } }],
    show: (st) => `${st.n} channel${st.n > 1 ? "s" : ""}: total flow 100 m\u00b3/s, drop 50 m`,
  });
  ctx.art.touchable(["try"]);
  return { destroy() {} };
}
