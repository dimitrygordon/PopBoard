// Barrier: Rotate the barrier and measure the angles.
import { calc, f2 } from "../kit.js";
const F = f2, E = (x, d = 2) => x.toExponential(d).replace(/e\+?(-?)(\d+)/, (_, s, p) => " \u00d7 10^" + (s ? "\u2212" : "") + p).replace("-", "\u2212"), R = (a) => a[Math.floor(Math.random() * a.length)];
export default function build(ctx) {
  const k = calc(ctx, {
    st: {},
    sliders: [{ key: "a", label: "Angle of incidence", min: 0, max: 80, step: 1, value: 30, unit: "\\u00b0", d: 0 }],
    cuts: [
    { id: "rot", label: "Angles: tap to explain", tap: (st, c) => { return "\u03b8_i = \u03b8_r."; } }],
    show: (st) => `incidence ${st.a}\u00b0, reflection ${st.a}\u00b0`,
  });
  ctx.art.touchable(["rot"]);
  return { destroy() {} };
}
