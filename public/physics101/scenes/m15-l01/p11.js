// Example Problem 1: 2.50 m gives 22.3 lx.
import { calc, f2 } from "../kit.js";
const F = f2, E = (x, d = 2) => x.toExponential(d).replace(/e\+?(-?)(\d+)/, (_, s, p) => " \u00d7 10^" + (s ? "\u2212" : "") + p).replace("-", "\u2212"), R = (a) => a[Math.floor(Math.random() * a.length)];
export default function build(ctx) {
  const k = calc(ctx, {
    st: {},
    sliders: [{ key: "r", label: "Height", min: 0.5, max: 4, step: 0.05, value: 2.5, unit: "m", d: 2 }],
    cuts: [
    { id: "lamp", label: "Lux: tap for the book's 2.50 m", tap: (st, c) => { st.r = 2.5; c.r.set(2.5); return "E = 22.3 lx."; } }],
    show: (st) => `E = P/4\u03c0r\u00b2 = ${F(1750 / (4 * Math.PI * st.r * st.r), 1)} lx`,
  });
  ctx.art.touchable(["lamp"]);
  return { destroy() {} };
}
