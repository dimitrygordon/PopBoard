// Example Problem 1: 21.1 mm gives 668 nm.
import { calc, f2 } from "../kit.js";
const F = f2, E = (x, d = 2) => x.toExponential(d).replace(/e\+?(-?)(\d+)/, (_, s, p) => " \u00d7 10^" + (s ? "\u2212" : "") + p).replace("-", "\u2212"), R = (a) => a[Math.floor(Math.random() * a.length)];
export default function build(ctx) {
  const k = calc(ctx, {
    st: {},
    sliders: [{ key: "x", label: "x", min: 10, max: 40, step: 0.1, value: 21.1, unit: "mm", d: 1 }],
    cuts: [
    { id: "try", label: "Spectrum bar: tap for the book's 21.1 mm", tap: (st, c) => { st.x = 21.1; c.x.set(21.1); return "\u03bb = 668 nm: red."; } }],
    show: (st) => `\u03bb = xd/L = ${F(st.x * 1e-3 * 1.9e-5 / 0.6 * 1e9, 0)} nm`,
  });
  ctx.art.touchable(["try"]);
  return { destroy() {} };
}
