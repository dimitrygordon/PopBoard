// Mirrors: Adjust the alignment.
import { calc, f2 } from "../kit.js";
const F = f2, E = (x, d = 2) => x.toExponential(d).replace(/e\+?(-?)(\d+)/, (_, s, p) => " \u00d7 10^" + (s ? "\u2212" : "") + p).replace("-", "\u2212"), R = (a) => a[Math.floor(Math.random() * a.length)];
export default function build(ctx) {
  const k = calc(ctx, {
    st: {},
    sliders: [{ key: "a", label: "Misalignment", min: 0, max: 5, step: 0.5, value: 2, unit: "mrad", d: 1 }],
    cuts: [
    { id: "try", label: "Chamber: tap to explain", tap: (st, c) => { return "Aligned mirrors keep photons bouncing."; } }],
    show: (st) => st.a <= 0.5 ? "beam builds" : "fizzles",
  });
  ctx.art.touchable(["try"]);
  return { destroy() {} };
}
