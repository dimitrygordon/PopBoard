// g = F/m at distance r (in Earth radii).
import { calc, f2 } from "../kit.js";
const F = f2, E = (x, d = 2) => x.toExponential(d).replace(/e\+?(-?)(\d+)/, (_, s, p) => " \u00d7 10^" + (s ? "\u2212" : "") + p).replace("-", "\u2212"), R = (a) => a[Math.floor(Math.random() * a.length)];
export default function build(ctx) {
  const k = calc(ctx, {
    st: {},
    sliders: [{ key: "m", label: "Test mass", min: 0.5, max: 5, step: 0.5, value: 1, unit: "kg", d: 1 }, { key: "r", label: "Distance", min: 1, max: 4, step: 0.5, value: 1, unit: "r_E", d: 1 }],
    cuts: [
    { id: "scale", label: "Scale: tap to read F over m", tap: (st, c) => { return `F / m = ${F(9.8 / st.r ** 2, 2)} newtons per kilogram, whatever the mass.`; } }],
    show: (st) => `F = ${F(st.m * 9.8 / st.r ** 2, 2)} N   F/m = ${F(9.8 / st.r ** 2, 2)} N/kg`,
  });
  ctx.art.touchable(["scale"]);
  return { destroy() {} };
}
