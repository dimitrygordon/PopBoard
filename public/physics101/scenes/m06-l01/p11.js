// Maximum height: speed 2 to 20 m/s (10), angle 10 to 80 degrees (45). h_max, range and flight time with no air resistance.
import { calc, f2, deg, rad2 } from "../kit.js";
export default function build(ctx) {
  calc(ctx, {
    st: {},
    sliders: [{ key: "v", label: "Speed", min: 2, max: 20, step: 0.5, value: 10, unit: "m/s", d: 1 }, { key: "t", label: "Angle", min: 10, max: 80, step: 1, value: 45, unit: "\u00b0", d: 0 }],
    cuts: [
    { id: "sv", label: "Speed and angle: tap for 45 degrees", tap: (st, c) => { st.t = 45; c.t.set(45); return ""; } }],
    show: (st) => `h_max ${f2(Math.pow(st.v * Math.sin(deg(st.t)), 2) / 19.6, 2)} m, range ${f2(st.v * st.v * Math.sin(deg(2 * st.t)) / 9.8, 1)} m\nflight ${f2(2 * st.v * Math.sin(deg(st.t)) / 9.8, 2)} s`,
  });
  ctx.art.touchable(["sv"]);
  return { destroy() {} };
}
