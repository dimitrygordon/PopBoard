// Law of cosines: A and B 0 to 10 units (defaults 5 and 4), angle between them 0 to 180 degrees (default 90). R^2 = A^2 + B^2 - 2AB cos(theta); at 90 degrees this is the Pythagorean theorem.
import { calc, f2, deg, rad2 } from "../kit.js";
export default function build(ctx) {
  calc(ctx, {
    st: {},
    sliders: [{ key: "A", label: "A", min: 0, max: 10, step: 0.5, value: 5, unit: "", d: 1 }, { key: "B", label: "B", min: 0, max: 10, step: 0.5, value: 4, unit: "", d: 1 }, { key: "t", label: "Angle", min: 0, max: 180, step: 5, value: 90, unit: "\u00b0", d: 0 }],
    cuts: [
    { id: "ang", label: "Angle: tap for 90 degrees", tap: (st, c) => { st.t = 90; c.t.set(90); return "At 90 degrees the cosine term vanishes: the Pythagorean theorem."; } }],
    show: (st) => `R = ${f2(Math.sqrt(st.A * st.A + st.B * st.B - 2 * st.A * st.B * Math.cos(deg(st.t))), 2)}${st.t === 90 ? " (Pythagorean case)" : ""}`,
  });
  ctx.art.touchable(["ang"]);
  return { destroy() {} };
}
