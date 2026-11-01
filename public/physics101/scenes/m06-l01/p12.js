// Example Problem 2: 4.5 m/s, angle 10 to 80 degrees (66). h_max = v_y^2 / 2g, t = 2 v_y / g: 0.86 m and 0.84 s at 66 degrees.
import { calc, f2, deg, rad2 } from "../kit.js";
export default function build(ctx) {
  calc(ctx, {
    st: {},
    sliders: [{ key: "t", label: "Angle", min: 10, max: 80, step: 1, value: 66, unit: "\u00b0", d: 0 }],
    cuts: [
    { id: "ang", label: "Angle: tap for 66 degrees", tap: (st, c) => { st.t = 66; c.t.set(66); return "At 66 degrees: 0.86 meters high, 0.84 seconds in the air."; } }],
    show: (st) => { const vy = 4.5 * Math.sin(deg(st.t)); return `v_y = ${f2(vy, 1)} m/s\nh_max = ${f2(vy * vy / 19.6, 2)} m, t = ${f2(2 * vy / 9.8, 2)} s`; },
  });
  ctx.art.touchable(["ang"]);
  return { destroy() {} };
}
