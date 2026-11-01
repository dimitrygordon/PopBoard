// Test charge: Set the test charge near q (force on a 1.0 \u00b5C test charge is 2.0 N).
import { calc, f2 } from "../kit.js";
const F = f2, E = (x, d = 2) => x.toExponential(d).replace(/e\+?(-?)(\d+)/, (_, s, p) => " \u00d7 10^" + (s ? "\u2212" : "") + p).replace("-", "\u2212"), R = (a) => a[Math.floor(Math.random() * a.length)];
export default function build(ctx) {
  const k = calc(ctx, {
    st: {},
    sliders: [{ key: "q", label: "q'", min: 1, max: 4, step: 1, value: 1, unit: "\\u00b5C", d: 0 }],
    cuts: [
    { id: "try", label: "Test charge: tap to explain", tap: (st, c) => { return "Double q', double F: F/q' stays the same."; } }],
    show: (st) => `F = ${2 * st.q}.0 N\nE = F/q' = 2.0 \u00d7 10\u2076 N/C`,
  });
  ctx.art.touchable(["try"]);
  return { destroy() {} };
}
