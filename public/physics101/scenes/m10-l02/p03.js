// Ball KE: Set the ball's mass and speed and read its kinetic energy.
import { calc, f2 } from "../kit.js";
const F = f2, E = (x, d = 2) => x.toExponential(d).replace(/e\+?(-?)(\d+)/, (_, s, p) => " \u00d7 10^" + (s ? "\u2212" : "") + p).replace("-", "\u2212"), R = (a) => a[Math.floor(Math.random() * a.length)];
export default function build(ctx) {
  const k = calc(ctx, {
    st: {},
    sliders: [{ key: "m", label: "Mass", min: 0.05, max: 7, step: 0.05, value: 0.145, unit: "kg", d: 2 }, { key: "v", label: "Speed", min: 0, max: 40, step: 1, value: 20, unit: "m/s", d: 0 }],
    cuts: [
    { id: "ball", label: "Ball: tap to double the speed", tap: (st, c) => { st.v = st.v >= 20 ? 5 : st.v * 2; c.v.set(st.v); return "Twice the speed: four times the kinetic energy."; } }],
    show: (st) => `KE = \u00bdmv\u00b2 = ${F(0.5 * st.m * st.v ** 2, 1)} J`,
  });
  ctx.art.touchable(["ball"]);
  return { destroy() {} };
}
