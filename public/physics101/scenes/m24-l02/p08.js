// Proton on carbon: Change the product's Z.
import { calc, f2 } from "../kit.js";
const F = f2, E = (x, d = 2) => x.toExponential(d).replace(/e\+?(-?)(\d+)/, (_, s, p) => " \u00d7 10^" + (s ? "\u2212" : "") + p).replace("-", "\u2212"), R = (a) => a[Math.floor(Math.random() * a.length)];
export default function build(ctx) {
  const k = calc(ctx, {
    st: {},
    sliders: [{ key: "z", label: "Product Z", min: 5, max: 8, step: 1, value: 6, unit: "", d: 0 }],
    cuts: [
    { id: "try", label: "Equation: tap to explain", tap: (st, c) => { return "6 + 1 = 7: nitrogen-13."; } }],
    show: (st) => st.z === 7 ? "\u2713 nitrogen-13" : "\u2717 not balanced",
  });
  ctx.art.touchable(["try"]);
  return { destroy() {} };
}
