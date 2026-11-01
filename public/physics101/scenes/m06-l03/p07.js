// Plane at 200 km/h airspeed with a crosswind 0 to 80 km/h (40, sandbox values): heading correction asin(w/v). Tap for the boat: 0 to 5 m/s current (2.0); hold still by rowing upstream at the current's speed.
import { calc, f2, deg, rad2 } from "../kit.js";
export default function build(ctx) {
  calc(ctx, {
    st: { b: false },
    sliders: [{ key: "w", label: "Crosswind or current", min: 0, max: 80, step: 1, value: 40, unit: "", d: 0 }],
    cuts: [
    { id: "wind", label: "Wind: tap to switch plane and boat", tap: (st) => { st.b = !st.b; return st.b ? "To hold still, row upstream exactly as fast as the current." : ""; } }],
    show: (st) => st.b ? `boat: row ${f2(st.w / 16, 1)} m/s upstream against a ${f2(st.w / 16, 1)} m/s current` : `steer ${f2(rad2(Math.asin(st.w / 200)), 1)}\u00b0 into the wind\nground speed ${f2(Math.sqrt(40000 - st.w * st.w), 0)} km/h`,
  });
  ctx.art.touchable(["wind"]);
  return { destroy() {} };
}
