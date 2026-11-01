// Example Problem 5: 7.3 m: KE 1.6e3 J, v = 12 m/s.
import { calc, f2 } from "../kit.js";
const F = f2, E = (x, d = 2) => x.toExponential(d).replace(/e\+?(-?)(\d+)/, (_, s, p) => " \u00d7 10^" + (s ? "\u2212" : "") + p).replace("-", "\u2212"), R = (a) => a[Math.floor(Math.random() * a.length)];
export default function build(ctx) {
  const k = calc(ctx, {
    st: {},
    sliders: [{ key: "h", label: "Drop to the roof", min: 1, max: 13, step: 0.1, value: 7.3, unit: "m", d: 1 }],
    cuts: [
    { id: "ex5", label: "Ex5: tap for the book's 7.3 m", tap: (st, c) => { st.h = 7.3; c.h.set(7.3); return "KE = 1.6 \u00d7 10\u00b3 J, v = 12 m/s."; } }],
    show: (st) => `KE = mgh = ${E(22 * 9.8 * st.h, 1)} J\nv = ${F(Math.sqrt(19.6 * st.h), 1)} m/s`,
  });
  ctx.art.touchable(["ex5"]);
  return { destroy() {} };
}
