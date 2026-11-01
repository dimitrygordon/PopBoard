// Example Problem 1: 4.0 V gives 6.4e-19 J, 4.0 eV.
import { calc, f2 } from "../kit.js";
const F = f2, E = (x, d = 2) => x.toExponential(d).replace(/e\+?(-?)(\d+)/, (_, s, p) => " \u00d7 10^" + (s ? "\u2212" : "") + p).replace("-", "\u2212"), R = (a) => a[Math.floor(Math.random() * a.length)];
export default function build(ctx) {
  const k = calc(ctx, {
    st: {},
    sliders: [{ key: "v", label: "V\\u2080", min: 1, max: 6, step: 0.1, value: 4, unit: "V", d: 1 }],
    cuts: [
    { id: "try", label: "Photocell: tap for the book's 4.0 V", tap: (st, c) => { st.v = 4; c.v.set(4); return "KE = 6.4 \u00d7 10\u207b\u00b9\u2079 J = 4.0 eV."; } }],
    show: (st) => `KE = ${E(1.602e-19 * st.v, 1)} J = ${F(st.v, 1)} eV`,
  });
  ctx.art.touchable(["try"]);
  return { destroy() {} };
}
