// E vs. r: Move the probe away from a 1.0 \u00b5C point charge.
import { calc, f2 } from "../kit.js";
const F = f2, E = (x, d = 2) => x.toExponential(d).replace(/e\+?(-?)(\d+)/, (_, s, p) => " \u00d7 10^" + (s ? "\u2212" : "") + p).replace("-", "\u2212"), R = (a) => a[Math.floor(Math.random() * a.length)];
export default function build(ctx) {
  const k = calc(ctx, {
    st: {},
    sliders: [{ key: "r", label: "r", min: 0.1, max: 1, step: 0.05, value: 0.2, unit: "m", d: 2 }],
    cuts: [
    { id: "try", label: "Graph: tap to explain", tap: (st, c) => { return "Double r, one fourth of E."; } }],
    show: (st) => `E = Kq/r\u00b2 = ${E(9e3 / st.r ** 2, 2)} N/C`,
  });
  ctx.art.touchable(["try"]);
  return { destroy() {} };
}
