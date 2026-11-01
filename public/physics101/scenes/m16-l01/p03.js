// Laser: Swing the laser around the mirror.
import { calc, f2 } from "../kit.js";
const F = f2, E = (x, d = 2) => x.toExponential(d).replace(/e\+?(-?)(\d+)/, (_, s, p) => " \u00d7 10^" + (s ? "\u2212" : "") + p).replace("-", "\u2212"), R = (a) => a[Math.floor(Math.random() * a.length)];
export default function build(ctx) {
  const k = calc(ctx, {
    st: {},
    sliders: [{ key: "a", label: "Angle of incidence", min: 0, max: 85, step: 1, value: 40, unit: "\\u00b0", d: 0 }],
    cuts: [
    { id: "try", label: "Mirror: tap to explain", tap: (st, c) => { return "\u03b8_r = \u03b8_i, always."; } }],
    show: (st) => `\u03b8_i = ${st.a}\u00b0, \u03b8_r = ${st.a}\u00b0`,
  });
  ctx.art.touchable(["try"]);
  return { destroy() {} };
}
