// Hose: launch angle 10 to 80 degrees (45), speed 2 to 15 m/s (10), from ground level, no air resistance.
import { calc, f2, deg, rad2 } from "../kit.js";
export default function build(ctx) {
  calc(ctx, {
    st: {},
    sliders: [{ key: "t", label: "Angle", min: 10, max: 80, step: 1, value: 45, unit: "\u00b0", d: 0 }, { key: "v", label: "Speed", min: 2, max: 15, step: 0.5, value: 10, unit: "m/s", d: 1 }],
    cuts: [
    { id: "hose", label: "Hose: tap to spray", tap: (st) => `The stream traces a parabola about ${f2(st.v * st.v * Math.sin(deg(2 * st.t)) / 9.8, 1)} meters long.` }],
    show: (st) => `range ${f2(st.v * st.v * Math.sin(deg(2 * st.t)) / 9.8, 1)} m, peak ${f2(Math.pow(st.v * Math.sin(deg(st.t)), 2) / 19.6, 2)} m`,
  });
  ctx.art.touchable(["hose"]);
  return { destroy() {} };
}
