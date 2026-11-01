// Example Problem 3: two 0.30 kg balls on a 0.66 m rod. Middle: 0.065 kg m^2. End: 0.13 kg m^2.
import { calc, f2 } from "../kit.js";
const F = f2, E = (x, d = 2) => x.toExponential(d).replace(/e\+?(-?)(\d+)/, (_, s, p) => " \u00d7 10^" + (s ? "\u2212" : "") + p).replace("-", "\u2212"), R = (a) => a[Math.floor(Math.random() * a.length)];
export default function build(ctx) {
  const k = calc(ctx, {
    st: { e: false },
    sliders: [],
    cuts: [
    { id: "ex3", label: "Ex3: tap to move the axis", tap: (st, c) => { st.e = !st.e; return st.e ? "About one end, I doubles to 0.13 kg\u00b7m\u00b2." : ""; } }],
    show: (st) => st.e ? "axis at one end: I = 0.30 \u00d7 0.66\u00b2 = 0.13 kg\u00b7m\u00b2" : "axis in the middle: I = 2 \u00d7 0.30 \u00d7 0.33\u00b2 = 0.065 kg\u00b7m\u00b2",
  });
  ctx.art.touchable(["ex3"]);
  return { destroy() {} };
}
