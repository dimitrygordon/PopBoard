// Incline: tilt 0 to 60 degrees (30); a 30 kg rider with no friction (sandbox). F_parallel = mg sin(theta), a = g sin(theta).
import { calc, f2, deg, rad2 } from "../kit.js";
export default function build(ctx) {
  calc(ctx, {
    st: {},
    sliders: [{ key: "t", label: "Tilt", min: 0, max: 60, step: 1, value: 30, unit: "\u00b0", d: 0 }],
    cuts: [
    { id: "tilt", label: "Tilt: tap to add 15 degrees", tap: (st, c) => { st.t = (st.t + 15) % 75; c.t.set(st.t); return `At ${st.t} degrees she accelerates at ${f2(9.8 * Math.sin(deg(st.t)), 1)} meters per second squared.`; } }],
    show: (st) => `F_parallel = ${f2(294 * Math.sin(deg(st.t)), 0)} N\na = ${f2(9.8 * Math.sin(deg(st.t)), 2)} m/s\u00b2`,
  });
  ctx.art.touchable(["tilt"]);
  return { destroy() {} };
}
