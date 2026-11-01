// Example Problem 7: 12.0 ohm: R_p 10.9, R 12.4.
import { calc, f2 } from "../kit.js";
const F = f2, E = (x, d = 2) => x.toExponential(d).replace(/e\+?(-?)(\d+)/, (_, s, p) => " \u00d7 10^" + (s ? "\u2212" : "") + p).replace("-", "\u2212"), R = (a) => a[Math.floor(Math.random() * a.length)];
export default function build(ctx) {
  const k = calc(ctx, {
    st: {},
    sliders: [{ key: "d", label: "Dryer R", min: 5, max: 50, step: 0.5, value: 12, unit: "\\u03a9", d: 1 }],
    cuts: [
    { id: "try", label: "Circuit: tap for the book's 12.0 \\u03a9", tap: (st, c) => { st.d = 12; c.d.set(12); return "R_p = 10.9 \u03a9, R = 12.4 \u03a9."; } }],
    show: (st) => (() => { const p = 1 / (1 / 125 + 1 / st.d); return `R_p = ${F(p, 1)} \u03a9\nR = ${F(p + 1.5, 1)} \u03a9`; })(),
  });
  ctx.art.touchable(["try"]);
  return { destroy() {} };
}
