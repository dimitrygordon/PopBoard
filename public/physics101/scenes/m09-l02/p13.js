// Gyroscope: Set the spin and tap the frame to tilt it. A fast gyroscope keeps pointing the same way.
import { calc, f2 } from "../kit.js";
const F = f2, E = (x, d = 2) => x.toExponential(d).replace(/e\+?(-?)(\d+)/, (_, s, p) => " \u00d7 10^" + (s ? "\u2212" : "") + p).replace("-", "\u2212"), R = (a) => a[Math.floor(Math.random() * a.length)];
export default function build(ctx) {
  const k = calc(ctx, {
    st: {},
    sliders: [{ key: "w", label: "Spin", min: 0, max: 300, step: 10, value: 200, unit: "rad/s", d: 0 }],
    cuts: [
    { id: "gyro", label: "Gyro: tap to tilt the frame", tap: (st, c) => { return st.w > 50 ? "The axis keeps its direction while the frame tilts around it." : "Barely spinning: the axis tips with the frame."; } }],
    show: (st) => `L = I\u03c9 = ${F(2e-4 * st.w, 3)} kg\u00b7m\u00b2/s\n${st.w > 50 ? "axis holds its direction" : "axis follows the frame"}`,
  });
  ctx.art.touchable(["gyro"]);
  return { destroy() {} };
}
