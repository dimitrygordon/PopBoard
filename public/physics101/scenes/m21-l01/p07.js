// Example Problem 1: EMF 0.11 V; 0.50 ohm: 0.22 A; 0.78 ohm: 0.14 A.
import { calc, f2 } from "../kit.js";
const F = f2, E = (x, d = 2) => x.toExponential(d).replace(/e\+?(-?)(\d+)/, (_, s, p) => " \u00d7 10^" + (s ? "\u2212" : "") + p).replace("-", "\u2212"), R = (a) => a[Math.floor(Math.random() * a.length)];
export default function build(ctx) {
  const k = calc(ctx, {
    st: { r: 0.5 },
    sliders: [],
    cuts: [
    { id: "try", label: "Circuit: tap to swap the metal", tap: (st, c) => { st.r = st.r === 0.5 ? 0.78 : 0.5; return ""; } }],
    show: (st) => `EMF = BLv = 0.11 V\nR = ${st.r} \u03a9: I = ${F(0.112 / st.r, 2)} A`,
  });
  ctx.art.touchable(["try"]);
  return { destroy() {} };
}
