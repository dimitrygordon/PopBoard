// Velocity in a circle: tap to halve the time between two points (start 2.0 s on a 4.0 s period). The angle between delta r and the tangent is half the angle swept, shrinking toward zero.
import { calc, f2, deg, rad2 } from "../kit.js";
export default function build(ctx) {
  calc(ctx, {
    st: { t: 2 },
    sliders: [],
    cuts: [
    { id: "dt", label: "Delta t: tap to halve it", tap: (st) => { st.t = st.t < 0.05 ? 2 : st.t / 2; return st.t < 0.1 ? "Now delta r almost lies along the tangent: that is the velocity." : ""; } }],
    show: (st) => `\u0394t = ${f2(st.t, 3)} s: \u0394r is ${f2(45 * st.t, 1)}\u00b0 off the tangent`,
  });
  ctx.art.touchable(["dt"]);
  return { destroy() {} };
}
