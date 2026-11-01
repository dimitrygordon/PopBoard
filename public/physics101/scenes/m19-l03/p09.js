// Example Problem 4: 47 ohm: 0.35 A, 16 V, 29 V.
import { calc, f2 } from "../kit.js";
const F = f2, E = (x, d = 2) => x.toExponential(d).replace(/e\+?(-?)(\d+)/, (_, s, p) => " \u00d7 10^" + (s ? "\u2212" : "") + p).replace("-", "\u2212"), R = (a) => a[Math.floor(Math.random() * a.length)];
export default function build(ctx) {
  const k = calc(ctx, {
    st: {},
    sliders: [{ key: "r", label: "R\\u2081", min: 10, max: 100, step: 1, value: 47, unit: "\\u03a9", d: 0 }],
    cuts: [
    { id: "try", label: "Meters: tap for the book's 47 \\u03a9", tap: (st, c) => { st.r = 47; c.r.set(47); return "I = 0.35 A, 16 V and 29 V."; } }],
    show: (st) => (() => { const i = 45 / (st.r + 82); return `I = ${F(i, 2)} A\n\u0394V\u2081 = ${F(i * st.r, 0)} V, \u0394V\u2082 = ${F(i * 82, 0)} V`; })(),
  });
  ctx.art.touchable(["try"]);
  return { destroy() {} };
}
