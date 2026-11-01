// Example Problem 2: camp 5 to 25 km (15.0) at 90 to 180 degrees from +x (140.0, i.e. 40.0 north of west); path north 0 to 15 km (5.0). B = R - A.
import { calc, f2, deg, rad2 } from "../kit.js";
export default function build(ctx) {
  calc(ctx, {
    st: {},
    sliders: [{ key: "R", label: "Camp distance", min: 5, max: 25, step: 0.5, value: 15, unit: "km", d: 1 }, { key: "t", label: "Camp direction", min: 90, max: 180, step: 1, value: 140, unit: "\u00b0", d: 0 }, { key: "A", label: "Path north", min: 0, max: 15, step: 0.5, value: 5, unit: "km", d: 1 }],
    cuts: [
    { id: "camp", label: "Camp: tap for the worked example", tap: (st, c) => { st.R = 15; st.t = 140; st.A = 5; c.R.set(15); c.t.set(140); c.A.set(5); return "B is about 12.4 kilometers at 21.5 degrees north of west."; } }],
    show: (st) => { const bx = st.R * Math.cos(deg(st.t)), by = st.R * Math.sin(deg(st.t)) - st.A; return `B_x = ${f2(bx, 1)} km, B_y = ${f2(by, 2)} km\nB = ${f2(Math.hypot(bx, by), 1)} km at ${f2(rad2(Math.atan2(by, bx)), 1)}\u00b0`; },
  });
  ctx.art.touchable(["camp"]);
  return { destroy() {} };
}
