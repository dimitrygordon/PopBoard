// Torque meter: Set the force, distance and angle. The meter reads \u03c4 = Fr sin\u03b8.
import { calc, f2 } from "../kit.js";
const F = f2, E = (x, d = 2) => x.toExponential(d).replace(/e\+?(-?)(\d+)/, (_, s, p) => " \u00d7 10^" + (s ? "\u2212" : "") + p).replace("-", "\u2212"), R = (a) => a[Math.floor(Math.random() * a.length)];
export default function build(ctx) {
  const k = calc(ctx, {
    st: {},
    sliders: [{ key: "F", label: "Force", min: 0, max: 100, step: 5, value: 40, unit: "N", d: 0 }, { key: "r", label: "Distance", min: 0, max: 1, step: 0.05, value: 0.3, unit: "m", d: 2 }, { key: "a", label: "Angle", min: 0, max: 180, step: 5, value: 90, unit: "\\u00b0", d: 0 }],
    cuts: [
    { id: "tau", label: "Tau: tap to reverse the force", tap: (st, c) => { st.a = (180 - st.a) % 181; c.a.set(st.a); return ""; } }],
    show: (st) => `\u03c4 = ${F(st.F, 0)} \u00d7 ${F(st.r, 2)} \u00d7 sin ${st.a}\u00b0 = ${F(st.F * st.r * Math.sin(st.a * Math.PI / 180), 1)} N\u00b7m`,
  });
  ctx.art.touchable(["tau"]);
  return { destroy() {} };
}
