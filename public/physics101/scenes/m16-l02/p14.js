// Aberration: Widen the beam, then tap to switch mirror shapes.
import { calc, f2 } from "../kit.js";
const F = f2, E = (x, d = 2) => x.toExponential(d).replace(/e\+?(-?)(\d+)/, (_, s, p) => " \u00d7 10^" + (s ? "\u2212" : "") + p).replace("-", "\u2212"), R = (a) => a[Math.floor(Math.random() * a.length)];
export default function build(ctx) {
  const k = calc(ctx, {
    st: { p: 0 },
    sliders: [{ key: "w", label: "Beam width", min: 1, max: 10, step: 1, value: 3, unit: "cm", d: 0 }],
    cuts: [
    { id: "try", label: "Mirror: tap to switch shape", tap: (st, c) => { st.p = 1 - st.p; return ""; } }],
    show: (st) => st.p ? "parabolic: sharp focus at any width" : `spherical: focus smeared over ${F(st.w * st.w * 0.05, 2)} cm`,
  });
  ctx.art.touchable(["try"]);
  return { destroy() {} };
}
