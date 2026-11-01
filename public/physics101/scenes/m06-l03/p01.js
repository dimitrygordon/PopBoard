// Bus at 15 m/s (sandbox); you sit still. Bus view: 0 m/s; roadside view: 15 m/s.
import { calc, f2, deg, rad2 } from "../kit.js";
export default function build(ctx) {
  calc(ctx, {
    st: { r: false },
    sliders: [],
    cuts: [
    { id: "view", label: "View: tap to switch", tap: (st) => { st.r = !st.r; return st.r ? "From the roadside you move at 15 meters per second." : "From your seat you are not moving at all."; } }],
    show: (st) => st.r ? "roadside view: you move at 15 m/s" : "bus view: you are at rest",
  });
  ctx.art.touchable(["view"]);
  return { destroy() {} };
}
