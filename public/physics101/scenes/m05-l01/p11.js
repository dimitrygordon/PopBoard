// Direction: spin a 5.0 unit vector 0 to 360 degrees (default 30). Quadrant and the signs of A_x and A_y.
import { calc, f2, deg, rad2 } from "../kit.js";
export default function build(ctx) {
  calc(ctx, {
    st: {},
    sliders: [{ key: "t", label: "Angle", min: 0, max: 360, step: 15, value: 30, unit: "\u00b0", d: 0 }],
    cuts: [
    { id: "spin", label: "Spin: tap to turn 90 degrees", tap: (st, c) => { st.t = (st.t + 90) % 360; c.t.set(st.t); return ""; } }],
    show: (st) => { const x = 5 * Math.cos(deg(st.t)), y = 5 * Math.sin(deg(st.t)), q = st.t % 90 === 0 ? "on an axis" : "quadrant " + ["I", "II", "III", "IV"][Math.floor(st.t / 90) % 4]; return `${st.t}\u00b0, ${q}\nA_x = ${f2(x, 2)}, A_y = ${f2(y, 2)}`; },
  });
  ctx.art.touchable(["spin"]);
  return { destroy() {} };
}
