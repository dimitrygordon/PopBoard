// Angle: Turn the 0.10 m wire carrying 5.0 A in a 0.40 T field.
import { calc, f2 } from "../kit.js";
const F = f2, E = (x, d = 2) => x.toExponential(d).replace(/e\+?(-?)(\d+)/, (_, s, p) => " \u00d7 10^" + (s ? "\u2212" : "") + p).replace("-", "\u2212"), R = (a) => a[Math.floor(Math.random() * a.length)];
export default function build(ctx) {
  const k = calc(ctx, {
    st: {},
    sliders: [{ key: "a", label: "\\u03b8", min: 0, max: 90, step: 5, value: 90, unit: "\\u00b0", d: 0 }],
    cuts: [
    { id: "try", label: "Wire: tap to explain", tap: (st, c) => { return "F = ILB sin\u03b8: zero when parallel."; } }],
    show: (st) => `F = ${F(0.2 * Math.sin(st.a * Math.PI / 180), 3)} N`,
  });
  ctx.art.touchable(["try"]);
  return { destroy() {} };
}
