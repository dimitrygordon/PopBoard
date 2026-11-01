// Example Problem 2: 0.12 N gives 4.0e4 N/C.
import { calc, f2 } from "../kit.js";
const F = f2, E = (x, d = 2) => x.toExponential(d).replace(/e\+?(-?)(\d+)/, (_, s, p) => " \u00d7 10^" + (s ? "\u2212" : "") + p).replace("-", "\u2212"), R = (a) => a[Math.floor(Math.random() * a.length)];
export default function build(ctx) {
  const k = calc(ctx, {
    st: {},
    sliders: [{ key: "f", label: "F", min: 0.01, max: 0.5, step: 0.01, value: 0.12, unit: "N", d: 2 }],
    cuts: [
    { id: "try", label: "Vector: tap for the book's 0.12 N", tap: (st, c) => { st.f = 0.12; c.f.set(0.12); return "E = 4.0 \u00d7 10\u2074 N/C at 15\u00b0 N of E."; } }],
    show: (st) => `E = F/q' = ${E(st.f / 3e-6, 1)} N/C, 15\u00b0 north of east`,
  });
  ctx.art.touchable(["try"]);
  return { destroy() {} };
}
