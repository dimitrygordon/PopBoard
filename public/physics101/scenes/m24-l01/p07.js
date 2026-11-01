// Chlorine: Change the chlorine-35 share.
import { calc, f2 } from "../kit.js";
const F = f2, E = (x, d = 2) => x.toExponential(d).replace(/e\+?(-?)(\d+)/, (_, s, p) => " \u00d7 10^" + (s ? "\u2212" : "") + p).replace("-", "\u2212"), R = (a) => a[Math.floor(Math.random() * a.length)];
export default function build(ctx) {
  const k = calc(ctx, {
    st: {},
    sliders: [{ key: "p", label: "Cl-35", min: 0, max: 100, step: 1, value: 76, unit: "%", d: 0 }],
    cuts: [
    { id: "try", label: "Average: tap to explain", tap: (st, c) => { return "Weighted average."; } }],
    show: (st) => `average = ${F((34.969 * st.p + 36.966 * (100 - st.p)) / 100, 2)} u`,
  });
  ctx.art.touchable(["try"]);
  return { destroy() {} };
}
