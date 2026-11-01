// Parabolic path: launched sideways at 5.0 m/s (sandbox); step t 0 to 2.0 s by 0.25 s. v is tangent to the path.
import { calc, f2, deg, rad2 } from "../kit.js";
export default function build(ctx) {
  calc(ctx, {
    st: {},
    sliders: [{ key: "t", label: "Time", min: 0, max: 2, step: 0.25, value: 0.5, unit: "s", d: 2 }],
    cuts: [
    { id: "step", label: "Step: tap to advance 0.25 s", tap: (st, c) => { st.t = st.t >= 2 ? 0 : st.t + 0.25; c.t.set(st.t); return ""; } }],
    show: (st) => { const vy = -9.8 * st.t; return `v_x = 5.0, v_y = ${f2(vy, 1)} m/s\nv = ${f2(Math.hypot(5, vy), 1)} m/s at ${f2(rad2(Math.atan2(vy, 5)), 0)}\u00b0`; },
  });
  ctx.art.touchable(["step"]);
  return { destroy() {} };
}
