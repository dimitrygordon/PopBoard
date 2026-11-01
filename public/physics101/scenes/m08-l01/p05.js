// Angle-time slope: Set the spin rate and tap the wheel to plot two seconds. \u03c9 is the slope of \u03b8 versus t.
import { calc, f2 } from "../kit.js";
const F = f2, E = (x, d = 2) => x.toExponential(d).replace(/e\+?(-?)(\d+)/, (_, s, p) => " \u00d7 10^" + (s ? "\u2212" : "") + p).replace("-", "\u2212"), R = (a) => a[Math.floor(Math.random() * a.length)];
export default function build(ctx) {
  const k = calc(ctx, {
    st: {},
    sliders: [{ key: "w", label: "Spin rate", min: 0.5, max: 10, step: 0.5, value: 2, unit: "rad/s", d: 1 }],
    cuts: [
    { id: "w", label: "W: tap to read the slope", tap: (st, c) => { return `In 2.0 s the angle grows by ${F(2 * st.w, 1)} radians: slope = ${F(st.w, 1)} rad/s.`; } }],
    show: (st) => `\u03b8 at 2.0 s = ${F(2 * st.w, 1)} rad\n\u03c9 = \u0394\u03b8/\u0394t = ${F(st.w, 1)} rad/s`,
  });
  ctx.art.touchable(["w"]);
  return { destroy() {} };
}
