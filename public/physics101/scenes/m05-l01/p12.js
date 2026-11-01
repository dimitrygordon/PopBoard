// Algebraic addition: A = 4.0 at 0 degrees, B = 3.0 at 90 degrees, C = 2.0 at 225 degrees (sandbox vectors). Tap resolve to add components.
import { calc, f2, deg, rad2 } from "../kit.js";
export default function build(ctx) {
  calc(ctx, {
    st: { r: false },
    sliders: [],
    cuts: [
    { id: "resolve", label: "Resolve: add the components", tap: (st) => { st.r = !st.r; return st.r ? "Add the x components, add the y components, then find R from the Pythagorean theorem and the inverse tangent." : ""; } }],
    show: (st) => { if (!st.r) return "A = 4.0 at 0\u00b0, B = 3.0 at 90\u00b0, C = 2.0 at 225\u00b0"; const x = 4 + 2 * Math.cos(deg(225)), y = 3 + 2 * Math.sin(deg(225)); return `R_x = ${f2(x, 2)}, R_y = ${f2(y, 2)}\nR = ${f2(Math.hypot(x, y), 2)} at ${f2(rad2(Math.atan2(y, x)), 0)}\u00b0`; },
  });
  ctx.art.touchable(["resolve"]);
  return { destroy() {} };
}
