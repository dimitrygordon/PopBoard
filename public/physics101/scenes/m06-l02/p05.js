// a_c = v^2 / r: speed 1 to 20 m/s (10), radius 1 to 50 m (10).
import { calc, f2, deg, rad2 } from "../kit.js";
export default function build(ctx) {
  calc(ctx, {
    st: {},
    sliders: [{ key: "v", label: "Speed", min: 1, max: 20, step: 0.5, value: 10, unit: "m/s", d: 1 }, { key: "r", label: "Radius", min: 1, max: 50, step: 0.5, value: 10, unit: "m", d: 1 }],
    cuts: [
    { id: "vr", label: "Speed and radius: tap to double the speed", tap: (st, c) => { st.v = Math.min(20, st.v * 2); c.v.set(st.v); return "Double the speed: four times the acceleration."; } }],
    show: (st) => `a_c = v\u00b2/r = ${f2(st.v * st.v / st.r, 2)} m/s\u00b2`,
  });
  ctx.art.touchable(["vr"]);
  return { destroy() {} };
}
