// Example Problem 1: rotate 35.0 deg: reflected ray turns 70.0 deg.
import { calc, f2 } from "../kit.js";
const F = f2, E = (x, d = 2) => x.toExponential(d).replace(/e\+?(-?)(\d+)/, (_, s, p) => " \u00d7 10^" + (s ? "\u2212" : "") + p).replace("-", "\u2212"), R = (a) => a[Math.floor(Math.random() * a.length)];
export default function build(ctx) {
  const k = calc(ctx, {
    st: {},
    sliders: [{ key: "r", label: "Mirror rotation", min: 0, max: 52, step: 1, value: 35, unit: "\\u00b0", d: 0 }],
    cuts: [
    { id: "try", label: "Mirror: tap for the book's 35.0\\u00b0", tap: (st, c) => { st.r = 35; c.r.set(35); return "New \u03b8_i = 17.0\u00b0; the reflected ray turns 70.0\u00b0."; } }],
    show: (st) => `\u03b8_i = ${52 - st.r}.0\u00b0\nreflected ray turns ${2 * st.r}.0\u00b0 (twice the mirror)`,
  });
  ctx.art.touchable(["try"]);
  return { destroy() {} };
}
