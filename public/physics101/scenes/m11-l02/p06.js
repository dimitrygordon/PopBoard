// Example Problem 3: 70.0 C gives 9.40e5 J.
import { calc, f2 } from "../kit.js";
const F = f2, E = (x, d = 2) => x.toExponential(d).replace(/e\+?(-?)(\d+)/, (_, s, p) => " \u00d7 10^" + (s ? "\u2212" : "") + p).replace("-", "\u2212"), R = (a) => a[Math.floor(Math.random() * a.length)];
export default function build(ctx) {
  const k = calc(ctx, {
    st: {},
    sliders: [{ key: "t", label: "Target temperature", min: 0, max: 100, step: 1, value: 70, unit: "\\u00b0C", d: 0 }],
    cuts: [
    { id: "ex3", label: "Total heat: tap for the book's 70.0 \\u00b0C", tap: (st, c) => { st.t = 70; c.t.set(70); return "Q total = 9.40 \u00d7 10\u2075 J."; } }],
    show: (st) => `melt: 5.01 \u00d7 10\u2075 J\nwarm: ${E(1.5 * 4180 * st.t, 2)} J\ntotal: ${E(5.01e5 + 1.5 * 4180 * st.t, 3)} J`,
  });
  ctx.art.touchable(["ex3"]);
  return { destroy() {} };
}
