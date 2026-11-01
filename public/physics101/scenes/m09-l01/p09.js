// p = m v; L = I omega with I = 2/5 m r^2, omega = v / r.
import { calc, f2 } from "../kit.js";
const F = f2, E = (x, d = 2) => x.toExponential(d).replace(/e\+?(-?)(\d+)/, (_, s, p) => " \u00d7 10^" + (s ? "\u2212" : "") + p).replace("-", "\u2212"), R = (a) => a[Math.floor(Math.random() * a.length)];
export default function build(ctx) {
  const k = calc(ctx, {
    st: {},
    sliders: [{ key: "v", label: "Speed", min: 0, max: 5, step: 0.5, value: 2, unit: "m/s", d: 1 }],
    cuts: [
    { id: "roll", label: "Roll: tap to stop the ball", tap: (st, c) => { st.v = 0; c.v.set(0); return "At rest: no momentum and no angular momentum."; } }],
    show: (st) => `p = mv = ${F(0.5 * st.v, 2)} kg\u00b7m/s\nL = I\u03c9 = ${F(0.4 * 0.5 * 0.01 * st.v / 0.1, 3)} kg\u00b7m\u00b2/s`,
  });
  ctx.art.touchable(["roll"]);
  return { destroy() {} };
}
