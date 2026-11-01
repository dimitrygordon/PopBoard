// Angle: Fire a proton at 1.0 \u00d7 10\u2076 m/s through a 0.50 T field.
import { calc, f2 } from "../kit.js";
const F = f2, E = (x, d = 2) => x.toExponential(d).replace(/e\+?(-?)(\d+)/, (_, s, p) => " \u00d7 10^" + (s ? "\u2212" : "") + p).replace("-", "\u2212"), R = (a) => a[Math.floor(Math.random() * a.length)];
export default function build(ctx) {
  const k = calc(ctx, {
    st: {},
    sliders: [{ key: "a", label: "Angle to field", min: 0, max: 90, step: 5, value: 90, unit: "\\u00b0", d: 0 }],
    cuts: [
    { id: "try", label: "Particle: tap to explain", tap: (st, c) => { return "Parallel to the field: no force."; } }],
    show: (st) => `F = qvB sin\u03b8 = ${E(1.602e-19 * 1e6 * 0.5 * Math.sin(st.a * Math.PI / 180), 2)} N`,
  });
  ctx.art.touchable(["try"]);
  return { destroy() {} };
}
