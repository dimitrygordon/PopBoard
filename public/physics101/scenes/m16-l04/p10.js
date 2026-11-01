// Lens aberration: Widen the beam through a spherical lens.
import { calc, f2 } from "../kit.js";
const F = f2, E = (x, d = 2) => x.toExponential(d).replace(/e\+?(-?)(\d+)/, (_, s, p) => " \u00d7 10^" + (s ? "\u2212" : "") + p).replace("-", "\u2212"), R = (a) => a[Math.floor(Math.random() * a.length)];
export default function build(ctx) {
  const k = calc(ctx, {
    st: {},
    sliders: [{ key: "w", label: "Beam width", min: 1, max: 10, step: 1, value: 3, unit: "cm", d: 0 }],
    cuts: [
    { id: "try", label: "Beam: tap to explain", tap: (st, c) => { return "Edge rays focus closer than center rays."; } }],
    show: (st) => `focus spread \u2248 ${F(st.w * st.w * 0.05, 2)} cm`,
  });
  ctx.art.touchable(["try"]);
  return { destroy() {} };
}
