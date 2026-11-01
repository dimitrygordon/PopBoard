// Fiber: Bend the fiber.
import { calc, f2 } from "../kit.js";
const F = f2, E = (x, d = 2) => x.toExponential(d).replace(/e\+?(-?)(\d+)/, (_, s, p) => " \u00d7 10^" + (s ? "\u2212" : "") + p).replace("-", "\u2212"), R = (a) => a[Math.floor(Math.random() * a.length)];
export default function build(ctx) {
  const k = calc(ctx, {
    st: {},
    sliders: [{ key: "a", label: "Angle at the wall", min: 30, max: 90, step: 5, value: 70, unit: "\\u00b0", d: 0 }],
    cuts: [
    { id: "try", label: "Fiber: tap to explain", tap: (st, c) => { return "Above the critical angle: total internal reflection."; } }],
    show: (st) => st.a > 42 ? "stays inside" : "leaks out",
  });
  ctx.art.touchable(["try"]);
  return { destroy() {} };
}
