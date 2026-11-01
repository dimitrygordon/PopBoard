// Tip to tail: A = 4.0 m along +x, B = 3.0 m at the angle you set (0 to 360 degrees from +x). Tap B to turn it 30 degrees. R from components; ruler and protractor readouts.
import { calc, f2, deg, rad2 } from "../kit.js";
export default function build(ctx) {
  calc(ctx, {
    st: {},
    sliders: [{ key: "t", label: "Direction of B", min: 0, max: 360, step: 5, value: 90, unit: "\u00b0", d: 0 }],
    cuts: [
    { id: "B", label: "Vector B: tap to turn it 30 degrees", tap: (st, c) => { st.t = (st.t + 30) % 360; c.t.set(st.t); return ""; } }],
    show: (st) => { const x = 4 + 3 * Math.cos(deg(st.t)), y = 3 * Math.sin(deg(st.t)); return `R = ${f2(Math.hypot(x, y), 2)} m at ${f2((rad2(Math.atan2(y, x)) + 360) % 360, 0)}\u00b0`; },
  });
  ctx.art.touchable(["B"]);
  return { destroy() {} };
}
