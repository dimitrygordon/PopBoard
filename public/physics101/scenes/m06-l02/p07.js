// Centripetal force: ball 0.1 to 2.0 kg (0.5), speed 1 to 10 m/s (4.0), chain 0.5 to 3.0 m (1.0). Tension = m v^2 / r.
import { calc, f2, deg, rad2 } from "../kit.js";
export default function build(ctx) {
  calc(ctx, {
    st: {},
    sliders: [{ key: "m", label: "Mass", min: 0.1, max: 2, step: 0.1, value: 0.5, unit: "kg", d: 1 }, { key: "v", label: "Speed", min: 1, max: 10, step: 0.5, value: 4, unit: "m/s", d: 1 }, { key: "r", label: "Radius", min: 0.5, max: 3, step: 0.1, value: 1, unit: "m", d: 1 }],
    cuts: [
    { id: "mvr", label: "Mass, speed, radius: tap to double the speed", tap: (st, c) => { st.v = Math.min(10, st.v * 2); c.v.set(st.v); return ""; } }],
    show: (st) => `F_T = m a_c = ${f2(st.m * st.v * st.v / st.r, 1)} N`,
  });
  ctx.art.touchable(["mvr"]);
  return { destroy() {} };
}
