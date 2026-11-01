// 1 u: Enter a mass.
import { calc, f2 } from "../kit.js";
const F = f2, E = (x, d = 2) => x.toExponential(d).replace(/e\+?(-?)(\d+)/, (_, s, p) => " \u00d7 10^" + (s ? "\u2212" : "") + p).replace("-", "\u2212"), R = (a) => a[Math.floor(Math.random() * a.length)];
export default function build(ctx) {
  const k = calc(ctx, {
    st: {},
    sliders: [{ key: "m", label: "Mass", min: 0.001, max: 2, step: 0.001, value: 1, unit: "u", d: 3 }],
    cuts: [
    { id: "try", label: "Equation: tap to explain", tap: (st, c) => { return "E = mc\u00b2."; } }],
    show: (st) => `E = ${E(st.m * 1.4924e-10, 3)} J = ${F(st.m * 931.49, 2)} MeV`,
  });
  ctx.art.touchable(["try"]);
  return { destroy() {} };
}
