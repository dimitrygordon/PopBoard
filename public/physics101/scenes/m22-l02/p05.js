// Example Problem 3: 75 V gives 0.14 nm.
import { calc, f2 } from "../kit.js";
const F = f2, E = (x, d = 2) => x.toExponential(d).replace(/e\+?(-?)(\d+)/, (_, s, p) => " \u00d7 10^" + (s ? "\u2212" : "") + p).replace("-", "\u2212"), R = (a) => a[Math.floor(Math.random() * a.length)];
export default function build(ctx) {
  const k = calc(ctx, {
    st: {},
    sliders: [{ key: "v", label: "\\u0394V", min: 10, max: 200, step: 5, value: 75, unit: "V", d: 0 }],
    cuts: [
    { id: "try", label: "Electron: tap for the book's 75 V", tap: (st, c) => { st.v = 75; c.v.set(75); return "\u03bb = 1.4 \u00d7 10\u207b\u00b9\u2070 m = 0.14 nm."; } }],
    show: (st) => (() => { const v = Math.sqrt(2 * 1.602e-19 * st.v / 9.11e-31); return `v = ${E(v, 2)} m/s\n\u03bb = ${F(6.626e-34 / (9.11e-31 * v) * 1e9, 2)} nm`; })(),
  });
  ctx.art.touchable(["try"]);
  return { destroy() {} };
}
