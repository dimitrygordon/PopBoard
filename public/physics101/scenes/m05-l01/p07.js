// Components: A from 0 to 10 at 0 to 360 degrees (defaults 5.0 at 30). A_x = A cos(theta), A_y = A sin(theta). Tap the tip chip for the theta = 0 case.
import { calc, f2, deg, rad2 } from "../kit.js";
export default function build(ctx) {
  calc(ctx, {
    st: {},
    sliders: [{ key: "A", label: "Length", min: 0, max: 10, step: 0.5, value: 5, unit: "", d: 1 }, { key: "t", label: "Angle", min: 0, max: 360, step: 5, value: 30, unit: "\u00b0", d: 0 }],
    cuts: [
    { id: "tip", label: "Vector tip: tap to lay it along the x-axis", tap: (st, c) => { st.t = 0; c.t.set(0); return "Along the x-axis, the y-component is zero."; } }],
    show: (st) => `A_x = ${f2(st.A * Math.cos(deg(st.t)), 2)}, A_y = ${f2(st.A * Math.sin(deg(st.t)), 2)}`,
  });
  ctx.art.touchable(["tip"]);
  return { destroy() {} };
}
