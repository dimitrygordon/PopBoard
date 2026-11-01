// Mass and charge: Change the ion's mass and charge (V = 34 V, B = 0.050 T).
import { calc, f2 } from "../kit.js";
const F = f2, E = (x, d = 2) => x.toExponential(d).replace(/e\+?(-?)(\d+)/, (_, s, p) => " \u00d7 10^" + (s ? "\u2212" : "") + p).replace("-", "\u2212"), R = (a) => a[Math.floor(Math.random() * a.length)];
export default function build(ctx) {
  const k = calc(ctx, {
    st: {},
    sliders: [{ key: "m", label: "Mass", min: 1, max: 40, step: 1, value: 20, unit: "proton masses", d: 0 }, { key: "q", label: "Charge", min: 1, max: 3, step: 1, value: 2, unit: "e", d: 0 }],
    cuts: [
    { id: "try", label: "Circle: tap to explain", tap: (st, c) => { return "r = \u221a(2Vm/q)/B."; } }],
    show: (st) => `r = ${F(Math.sqrt(2 * 34 * st.m * 1.67e-27 / (st.q * 1.602e-19)) / 0.05 * 1000, 0)} mm`,
  });
  ctx.art.touchable(["try"]);
  return { destroy() {} };
}
