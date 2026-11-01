// Precession rate = m g r / (I omega); m = 0.10 kg, r = 0.03 m, I = 2.0e-5, omega = 150 rad/s (sandbox). Rate does not depend on the tilt angle.
import { calc, f2 } from "../kit.js";
const F = f2, E = (x, d = 2) => x.toExponential(d).replace(/e\+?(-?)(\d+)/, (_, s, p) => " \u00d7 10^" + (s ? "\u2212" : "") + p).replace("-", "\u2212"), R = (a) => a[Math.floor(Math.random() * a.length)];
export default function build(ctx) {
  const k = calc(ctx, {
    st: {},
    sliders: [{ key: "a", label: "Tilt", min: 5, max: 60, step: 5, value: 20, unit: "\\u00b0", d: 0 }],
    cuts: [
    { id: "top", label: "Top: tap to spin it slower", tap: (st, c) => { return "A slower top precesses faster."; } }],
    show: (st) => `precession = mgr / (I\u03c9) = ${F(0.1 * 9.8 * 0.03 / (2e-5 * 150), 1)} rad/s\n(the tilt of ${st.a}\u00b0 does not change it)`,
  });
  ctx.art.touchable(["top"]);
  return { destroy() {} };
}
