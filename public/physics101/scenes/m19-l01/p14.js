// Target: Adjust the battery and resistor to hit 0.1 A.
import { calc, f2 } from "../kit.js";
const F = f2, E = (x, d = 2) => x.toExponential(d).replace(/e\+?(-?)(\d+)/, (_, s, p) => " \u00d7 10^" + (s ? "\u2212" : "") + p).replace("-", "\u2212"), R = (a) => a[Math.floor(Math.random() * a.length)];
export default function build(ctx) {
  const k = calc(ctx, {
    st: {},
    sliders: [{ key: "v", label: "\\u0394V", min: 1, max: 12, step: 0.5, value: 6, unit: "V", d: 1 }, { key: "r", label: "R", min: 10, max: 200, step: 10, value: 100, unit: "\\u03a9", d: 0 }],
    cuts: [
    { id: "try", label: "Ammeter: tap to check", tap: (st, c) => { return Math.abs(st.v / st.r - 0.1) < 0.002 ? "Hit it: 0.1 A." : "Not yet."; } }],
    show: (st) => `I = ${F(st.v / st.r, 3)} A (target 0.100 A)`,
  });
  ctx.art.touchable(["try"]);
  return { destroy() {} };
}
