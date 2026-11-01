// Pond: Add ripples to the pond and watch the tree's reflection break apart.
import { calc, f2 } from "../kit.js";
const F = f2, E = (x, d = 2) => x.toExponential(d).replace(/e\+?(-?)(\d+)/, (_, s, p) => " \u00d7 10^" + (s ? "\u2212" : "") + p).replace("-", "\u2212"), R = (a) => a[Math.floor(Math.random() * a.length)];
export default function build(ctx) {
  const k = calc(ctx, {
    st: {},
    sliders: [{ key: "r", label: "Ripples", min: 0, max: 10, step: 1, value: 0, unit: "", d: 0 }],
    cuts: [
    { id: "try", label: "Pond: tap to explain", tap: (st, c) => { return "A rough surface sends reflected rays in many directions."; } }],
    show: (st) => st.r === 0 ? "smooth: a clear reflected image" : st.r < 5 ? "a few ripples: wobbly image" : "rough: the image breaks apart",
  });
  ctx.art.touchable(["try"]);
  return { destroy() {} };
}
