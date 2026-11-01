// Torsion balance: Halve the charge by sharing and change the distance.
import { calc, f2 } from "../kit.js";
const F = f2, E = (x, d = 2) => x.toExponential(d).replace(/e\+?(-?)(\d+)/, (_, s, p) => " \u00d7 10^" + (s ? "\u2212" : "") + p).replace("-", "\u2212"), R = (a) => a[Math.floor(Math.random() * a.length)];
export default function build(ctx) {
  const k = calc(ctx, {
    st: {},
    sliders: [{ key: "r", label: "Distance", min: 1, max: 4, step: 0.5, value: 1, unit: "\\u00d7 r\\u2080", d: 1 }, { key: "h", label: "Times the charge is halved", min: 0, max: 3, step: 1, value: 0, unit: "", d: 0 }],
    cuts: [
    { id: "try", label: "Balance: tap to explain", tap: (st, c) => { return "F \u221d q\u2081q\u2082/r\u00b2."; } }],
    show: (st) => `force = ${F(1 / 2 ** st.h / st.r ** 2, 3)} \u00d7 starting force`,
  });
  ctx.art.touchable(["try"]);
  return { destroy() {} };
}
