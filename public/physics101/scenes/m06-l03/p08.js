// Components: frame 0 to 10 m/s at 0 to 360 degrees (5.0 at 0), object 0 to 10 m/s at 0 to 360 degrees (3.0 at 120). Components add.
import { calc, f2, deg, rad2 } from "../kit.js";
export default function build(ctx) {
  calc(ctx, {
    st: {},
    sliders: [{ key: "a", label: "Frame speed", min: 0, max: 10, step: 0.5, value: 5, unit: "m/s", d: 1 }, { key: "p", label: "Frame angle", min: 0, max: 360, step: 5, value: 0, unit: "\u00b0", d: 0 }, { key: "b", label: "Object speed", min: 0, max: 10, step: 0.5, value: 3, unit: "m/s", d: 1 }, { key: "q", label: "Object angle", min: 0, max: 360, step: 5, value: 120, unit: "\u00b0", d: 0 }],
    cuts: [
    { id: "ang", label: "Angles: tap to turn the object 30 degrees", tap: (st, c) => { st.q = (st.q + 30) % 360; c.q.set(st.q); return ""; } }],
    show: (st) => { const x = st.a * Math.cos(deg(st.p)) + st.b * Math.cos(deg(st.q)), y = st.a * Math.sin(deg(st.p)) + st.b * Math.sin(deg(st.q)); return `v_x = ${f2(x, 2)}, v_y = ${f2(y, 2)} m/s\nv = ${f2(Math.hypot(x, y), 2)} m/s at ${f2((rad2(Math.atan2(y, x)) + 360) % 360, 0)}\u00b0`; },
  });
  ctx.art.touchable(["ang"]);
  return { destroy() {} };
}
