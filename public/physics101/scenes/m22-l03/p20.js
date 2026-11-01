// Quantized: Step n.
import { calc, f2 } from "../kit.js";
const F = f2, E = (x, d = 2) => x.toExponential(d).replace(/e\+?(-?)(\d+)/, (_, s, p) => " \u00d7 10^" + (s ? "\u2212" : "") + p).replace("-", "\u2212"), R = (a) => a[Math.floor(Math.random() * a.length)];
export default function build(ctx) {
  const k = calc(ctx, {
    st: {},
    sliders: [{ key: "n", label: "n", min: 1, max: 4, step: 1, value: 1, unit: "", d: 0 }],
    cuts: [
    { id: "try", label: "Orbits: tap to explain", tap: (st, c) => { return "r \u221d n\u00b2."; } }],
    show: (st) => `r = ${st.n * st.n} \u00d7 r\u2081`,
  });
  ctx.art.touchable(["try"]);
  return { destroy() {} };
}
