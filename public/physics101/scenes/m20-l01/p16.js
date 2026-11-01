// Wire field: Change the current and the distance.
import { calc, f2 } from "../kit.js";
const F = f2, E = (x, d = 2) => x.toExponential(d).replace(/e\+?(-?)(\d+)/, (_, s, p) => " \u00d7 10^" + (s ? "\u2212" : "") + p).replace("-", "\u2212"), R = (a) => a[Math.floor(Math.random() * a.length)];
export default function build(ctx) {
  const k = calc(ctx, {
    st: {},
    sliders: [{ key: "i", label: "I", min: 1, max: 20, step: 1, value: 10, unit: "A", d: 0 }, { key: "r", label: "r", min: 0.01, max: 0.2, step: 0.01, value: 0.05, unit: "m", d: 2 }],
    cuts: [
    { id: "try", label: "Field: tap to explain", tap: (st, c) => { return "B grows with I and falls as 1/r."; } }],
    show: (st) => `B = ${E(2e-7 * st.i / st.r, 2)} T`,
  });
  ctx.art.touchable(["try"]);
  return { destroy() {} };
}
