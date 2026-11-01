// Choosing axes: on a frictionless incline (0 to 60 degrees, 30) with gravity and the normal force, level axes need both forces split; tilted axes need only the weight.
import { calc, f2, deg, rad2 } from "../kit.js";
export default function build(ctx) {
  calc(ctx, {
    st: { tilt: false },
    sliders: [{ key: "t", label: "Incline", min: 0, max: 60, step: 1, value: 30, unit: "\u00b0", d: 0 }],
    cuts: [
    { id: "axes", label: "Axes: tap to tilt or level them", tap: (st) => { st.tilt = !st.tilt; return st.tilt ? "Tilted axes: only the weight needs components." : "Level axes: the normal force needs components too."; } }],
    show: (st) => st.tilt ? `tilted axes: split 1 force (F_g)\nF_gx = ${f2(-Math.sin(deg(st.t)), 2)} mg, F_gy = ${f2(-Math.cos(deg(st.t)), 2)} mg` : `level axes: split 1 or more forces (F_N at ${st.t}\u00b0)\nand the acceleration too`,
  });
  ctx.art.touchable(["axes"]);
  return { destroy() {} };
}
