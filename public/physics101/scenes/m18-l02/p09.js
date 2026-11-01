// Coulomb: Set two charges and the distance.
import { calc, f2 } from "../kit.js";
const F = f2, E = (x, d = 2) => x.toExponential(d).replace(/e\+?(-?)(\d+)/, (_, s, p) => " \u00d7 10^" + (s ? "\u2212" : "") + p).replace("-", "\u2212"), R = (a) => a[Math.floor(Math.random() * a.length)];
export default function build(ctx) {
  const k = calc(ctx, {
    st: {},
    sliders: [{ key: "a", label: "q_A", min: 1, max: 10, step: 1, value: 6, unit: "\\u00b5C", d: 0 }, { key: "b", label: "q_B", min: 1, max: 10, step: 1, value: 3, unit: "\\u00b5C", d: 0 }, { key: "r", label: "r", min: 0.02, max: 0.3, step: 0.01, value: 0.04, unit: "m", d: 2 }],
    cuts: [
    { id: "try", label: "Force: tap to explain", tap: (st, c) => { return "Double r: one fourth the force. Triple r: one ninth."; } }],
    show: (st) => `F = Kq_Aq_B/r\u00b2 = ${F(9e9 * st.a * st.b * 1e-12 / st.r ** 2, 1)} N`,
  });
  ctx.art.touchable(["try"]);
  return { destroy() {} };
}
