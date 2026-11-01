// Mass defect: Tap to snap them together.
import { calc, f2 } from "../kit.js";
const F = f2, E = (x, d = 2) => x.toExponential(d).replace(/e\+?(-?)(\d+)/, (_, s, p) => " \u00d7 10^" + (s ? "\u2212" : "") + p).replace("-", "\u2212"), R = (a) => a[Math.floor(Math.random() * a.length)];
export default function build(ctx) {
  const k = calc(ctx, {
    st: { s: 0 },
    sliders: [],
    cuts: [
    { id: "try", label: "Scale: tap to snap", tap: (st, c) => { st.s = 1 - st.s; return ""; } }],
    show: (st) => st.s ? "helium-4 nucleus: 4.001506 u (0.030377 u less)" : "parts: 2(1.007276) + 2(1.008665) = 4.031883 u",
  });
  ctx.art.touchable(["try"]);
  return { destroy() {} };
}
