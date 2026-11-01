// Petals: Increase the disorder in the petal ridges.
import { calc, f2 } from "../kit.js";
const F = f2, E = (x, d = 2) => x.toExponential(d).replace(/e\+?(-?)(\d+)/, (_, s, p) => " \u00d7 10^" + (s ? "\u2212" : "") + p).replace("-", "\u2212"), R = (a) => a[Math.floor(Math.random() * a.length)];
export default function build(ctx) {
  const k = calc(ctx, {
    st: {},
    sliders: [{ key: "r", label: "Spacing variation", min: 0, max: 50, step: 5, value: 20, unit: "%", d: 0 }],
    cuts: [
    { id: "try", label: "Petal: tap to explain", tap: (st, c) => { return "Some disorder spreads the diffraction into a blue-violet halo bees see."; } }],
    show: (st) => st.r < 10 ? "too regular: an iridescent rainbow" : "disordered: a blue halo strengthens",
  });
  ctx.art.touchable(["try"]);
  return { destroy() {} };
}
