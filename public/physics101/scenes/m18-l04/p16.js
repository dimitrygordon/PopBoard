// q vs. \u0394V: Step the voltage on a 2.0 \u00b5F capacitor.
import { calc, f2 } from "../kit.js";
const F = f2, E = (x, d = 2) => x.toExponential(d).replace(/e\+?(-?)(\d+)/, (_, s, p) => " \u00d7 10^" + (s ? "\u2212" : "") + p).replace("-", "\u2212"), R = (a) => a[Math.floor(Math.random() * a.length)];
export default function build(ctx) {
  const k = calc(ctx, {
    st: {},
    sliders: [{ key: "v", label: "\\u0394V", min: 0, max: 12, step: 1, value: 6, unit: "V", d: 0 }],
    cuts: [
    { id: "try", label: "Graph: tap to explain", tap: (st, c) => { return "The slope of q vs. \u0394V is C."; } }],
    show: (st) => `q = C\u0394V = ${2 * st.v} \u00b5C`,
  });
  ctx.art.touchable(["try"]);
  return { destroy() {} };
}
