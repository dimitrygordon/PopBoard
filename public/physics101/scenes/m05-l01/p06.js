// Example Problem 1: A = 25 km and B = 15 km; set the angle 0 to 180 degrees (default 90). R = 29 km at 90, 37 km at 135.
import { calc, f2, deg, rad2 } from "../kit.js";
export default function build(ctx) {
  calc(ctx, {
    st: { },
    sliders: [{ key: "t", label: "Angle", min: 0, max: 180, step: 5, value: 90, unit: "\u00b0", d: 0 }],
    cuts: [
    { id: "ang", label: "Angle: tap for 90 or 135 degrees", tap: (st, c) => { st.t = st.t === 90 ? 135 : 90; c.t.set(st.t); return `At ${st.t} degrees, R is ${f2(Math.sqrt(850 - 750 * Math.cos(deg(st.t))), 0)} kilometers.`; } }],
    show: (st) => `A = 25 km, B = 15 km, \u03b8 = ${st.t}\u00b0\nR = ${f2(Math.sqrt(850 - 750 * Math.cos(deg(st.t))), 1)} km`,
  });
  ctx.art.touchable(["ang"]);
  return { destroy() {} };
}
