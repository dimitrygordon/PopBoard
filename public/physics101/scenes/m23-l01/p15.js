// Example Problem 3: 1 per 10^6 gives 4.99e16, ratio 3.44e6.
import { calc, f2 } from "../kit.js";
const F = f2, E = (x, d = 2) => x.toExponential(d).replace(/e\+?(-?)(\d+)/, (_, s, p) => " \u00d7 10^" + (s ? "\u2212" : "") + p).replace("-", "\u2212"), R = (a) => a[Math.floor(Math.random() * a.length)];
export default function build(ctx) {
  const k = calc(ctx, {
    st: {},
    sliders: [{ key: "d", label: "Arsenic per 10\\u2076 Si", min: 0.1, max: 10, step: 0.1, value: 1, unit: "", d: 1 }],
    cuts: [
    { id: "try", label: "Meter: tap for the book's 1 per million", tap: (st, c) => { st.d = 1; c.d.set(1); return "4.99 \u00d7 10\u00b9\u2076 /cm\u00b3, about 3 million times intrinsic."; } }],
    show: (st) => `donated: ${E(4.99e16 * st.d, 2)} /cm\u00b3\nratio: ${E(4.99e16 * st.d / 1.45e10, 2)}`,
  });
  ctx.art.touchable(["try"]);
  return { destroy() {} };
}
