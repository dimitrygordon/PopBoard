// Two dimensions: frame 0 to 10 m/s along +x (4.0), object in frame 0 to 10 m/s (3.0) at 0 to 180 degrees (90). Resultant tip to tail.
import { calc, f2, deg, rad2 } from "../kit.js";
export default function build(ctx) {
  calc(ctx, {
    st: {},
    sliders: [{ key: "a", label: "Frame", min: 0, max: 10, step: 0.5, value: 4, unit: "m/s", d: 1 }, { key: "b", label: "Object", min: 0, max: 10, step: 0.5, value: 3, unit: "m/s", d: 1 }, { key: "t", label: "Object angle", min: 0, max: 180, step: 5, value: 90, unit: "\u00b0", d: 0 }],
    cuts: [
    { id: "tt", label: "Tip to tail: tap for perpendicular", tap: (st, c) => { st.t = 90; c.t.set(90); return ""; } }],
    show: (st) => { const x = st.a + st.b * Math.cos(deg(st.t)), y = st.b * Math.sin(deg(st.t)); return `ground: ${f2(Math.hypot(x, y), 2)} m/s at ${f2(rad2(Math.atan2(y, x)), 0)}\u00b0`; },
  });
  ctx.art.touchable(["tt"]);
  return { destroy() {} };
}
