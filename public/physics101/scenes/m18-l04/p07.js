// Plates: Change the field and the plate spacing.
import { calc, f2 } from "../kit.js";
const F = f2, E = (x, d = 2) => x.toExponential(d).replace(/e\+?(-?)(\d+)/, (_, s, p) => " \u00d7 10^" + (s ? "\u2212" : "") + p).replace("-", "\u2212"), R = (a) => a[Math.floor(Math.random() * a.length)];
export default function build(ctx) {
  const k = calc(ctx, {
    st: {},
    sliders: [{ key: "e", label: "E", min: 100, max: 5000, step: 100, value: 1800, unit: "N/C", d: 0 }, { key: "d", label: "d", min: 0.5, max: 5, step: 0.1, value: 1.5, unit: "cm", d: 1 }],
    cuts: [
    { id: "try", label: "Plates: tap to explain", tap: (st, c) => { return "\u0394V = Ed."; } }],
    show: (st) => `\u0394V = ${F(st.e * st.d / 100, 1)} V`,
  });
  ctx.art.touchable(["try"]);
  return { destroy() {} };
}
