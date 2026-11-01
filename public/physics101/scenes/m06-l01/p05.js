// Pebble off a cliff at 3.0 m/s (sandbox), dots every 0.5 s to 2.0 s. v_x stays 3.0; v_y grows by 4.9 m/s each step.
import { calc, f2, deg, rad2 } from "../kit.js";
export default function build(ctx) {
  calc(ctx, {
    st: { y: false },
    sliders: [],
    cuts: [
    { id: "xy", label: "Motion diagrams: tap to toggle x and y", tap: (st) => { st.y = !st.y; return st.y ? "Vertically the arrows grow: gravity speeds it up." : "Horizontally every arrow is the same length."; } }],
    show: (st) => st.y ? "v_y: 0, \u22124.9, \u22129.8, \u221214.7, \u221219.6 m/s" : "v_x: 3.0, 3.0, 3.0, 3.0, 3.0 m/s",
  });
  ctx.art.touchable(["xy"]);
  return { destroy() {} };
}
