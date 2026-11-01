// Flashlight: Tilt the underwater flashlight (water n = 1.33 into air).
import { calc, f2 } from "../kit.js";
const F = f2, E = (x, d = 2) => x.toExponential(d).replace(/e\+?(-?)(\d+)/, (_, s, p) => " \u00d7 10^" + (s ? "\u2212" : "") + p).replace("-", "\u2212"), R = (a) => a[Math.floor(Math.random() * a.length)];
export default function build(ctx) {
  const k = calc(ctx, {
    st: {},
    sliders: [{ key: "a", label: "Angle from the normal", min: 0, max: 80, step: 0.5, value: 30, unit: "\\u00b0", d: 1 }],
    cuts: [
    { id: "try", label: "Beam: tap to explain", tap: (st, c) => { return "Critical angle: sin\u03b8_c = 1.00/1.33, \u03b8_c = 48.8\u00b0."; } }],
    show: (st) => (() => { const s = 1.33 * Math.sin(st.a * Math.PI / 180); return s >= 1 ? "total internal reflection" : `refracted into air at ${F(Math.asin(s) * 180 / Math.PI, 1)}\u00b0`; })(),
  });
  ctx.art.touchable(["try"]);
  return { destroy() {} };
}
