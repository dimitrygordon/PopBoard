// Work per charge: Change the test charge moved between the same two points (\u0394V = 12 V).
import { calc, f2 } from "../kit.js";
const F = f2, E = (x, d = 2) => x.toExponential(d).replace(/e\+?(-?)(\d+)/, (_, s, p) => " \u00d7 10^" + (s ? "\u2212" : "") + p).replace("-", "\u2212"), R = (a) => a[Math.floor(Math.random() * a.length)];
export default function build(ctx) {
  const k = calc(ctx, {
    st: {},
    sliders: [{ key: "q", label: "q'", min: 1, max: 5, step: 1, value: 1, unit: "\\u00b5C", d: 0 }],
    cuts: [
    { id: "try", label: "Points: tap to explain", tap: (st, c) => { return "W/q' stays 12 V."; } }],
    show: (st) => `W = ${12 * st.q} \u00b5J\n\u0394V = W/q' = 12 V`,
  });
  ctx.art.touchable(["try"]);
  return { destroy() {} };
}
