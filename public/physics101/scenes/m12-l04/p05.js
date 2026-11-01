// Spacing: Heat the ball-and-spring solid and watch the spacing grow.
import { calc, f2 } from "../kit.js";
const F = f2, E = (x, d = 2) => x.toExponential(d).replace(/e\+?(-?)(\d+)/, (_, s, p) => " \u00d7 10^" + (s ? "\u2212" : "") + p).replace("-", "\u2212"), R = (a) => a[Math.floor(Math.random() * a.length)];
export default function build(ctx) {
  const k = calc(ctx, {
    st: {},
    sliders: [{ key: "t", label: "Temperature", min: 0, max: 500, step: 10, value: 20, unit: "\\u00b0C", d: 0 }],
    cuts: [
    { id: "heat", label: "Spacing: tap to explain", tap: (st, c) => { return "Bigger vibrations push the average spacing out."; } }],
    show: (st) => `average spacing grows by ${F(12e-6 * (st.t - 20) * 100, 3)}% (steel)`,
  });
  ctx.art.touchable(["heat"]);
  return { destroy() {} };
}
