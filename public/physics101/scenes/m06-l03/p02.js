// Bus 0 to 20 m/s (10), walk 0 to 2.0 m/s (1.5); tap to walk forward or backward. Roadside speed = bus + walk.
import { calc, f2, deg, rad2 } from "../kit.js";
export default function build(ctx) {
  calc(ctx, {
    st: { f: 1 },
    sliders: [{ key: "b", label: "Bus", min: 0, max: 20, step: 0.5, value: 10, unit: "m/s", d: 1 }, { key: "w", label: "Walk", min: 0, max: 2, step: 0.1, value: 1.5, unit: "m/s", d: 1 }],
    cuts: [
    { id: "walk", label: "Walking direction: tap to turn around", tap: (st) => { st.f = -st.f; return ""; } }],
    show: (st) => `v_you/road = ${f2(st.b, 1)} ${st.f > 0 ? "+" : "\u2212"} ${f2(st.w, 1)} = ${f2(st.b + st.f * st.w, 1)} m/s`,
  });
  ctx.art.touchable(["walk"]);
  return { destroy() {} };
}
