// Conducting sphere: Bring a positive charge closer to a conducting sphere.
import { calc, f2 } from "../kit.js";
const F = f2, E = (x, d = 2) => x.toExponential(d).replace(/e\+?(-?)(\d+)/, (_, s, p) => " \u00d7 10^" + (s ? "\u2212" : "") + p).replace("-", "\u2212"), R = (a) => a[Math.floor(Math.random() * a.length)];
export default function build(ctx) {
  const k = calc(ctx, {
    st: {},
    sliders: [{ key: "d", label: "Distance", min: 1, max: 10, step: 0.5, value: 5, unit: "radii", d: 1 }],
    cuts: [
    { id: "try", label: "Sphere: tap to explain", tap: (st, c) => { return "Close up, the sphere's charge shifts, so it's no longer a point charge."; } }],
    show: (st) => st.d < 3 ? "charge shifts off center: Coulomb's law is only approximate" : "far away: the sphere acts like a point charge",
  });
  ctx.art.touchable(["try"]);
  return { destroy() {} };
}
