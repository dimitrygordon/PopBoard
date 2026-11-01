// Fiber: Change the cladding index (core n = 1.50) and the ray's angle at the wall.
import { calc, f2 } from "../kit.js";
const F = f2, E = (x, d = 2) => x.toExponential(d).replace(/e\+?(-?)(\d+)/, (_, s, p) => " \u00d7 10^" + (s ? "\u2212" : "") + p).replace("-", "\u2212"), R = (a) => a[Math.floor(Math.random() * a.length)];
export default function build(ctx) {
  const k = calc(ctx, {
    st: {},
    sliders: [{ key: "c", label: "Cladding n", min: 1, max: 1.49, step: 0.01, value: 1.4, unit: "", d: 2 }, { key: "a", label: "Angle at the wall", min: 40, max: 89, step: 1, value: 80, unit: "\\u00b0", d: 0 }],
    cuts: [
    { id: "try", label: "Fiber: tap to explain", tap: (st, c) => { return "Light stays trapped beyond the critical angle."; } }],
    show: (st) => (() => { const tc = Math.asin(st.c / 1.5) * 180 / Math.PI; return `critical angle = ${F(tc, 1)}\u00b0\n${st.a > tc ? "trapped" : "leaks out"}`; })(),
  });
  ctx.art.touchable(["try"]);
  return { destroy() {} };
}
