// Divider: Choose R\u2081 and R\u2082 to hit 5 V from 9 V.
import { calc, f2 } from "../kit.js";
const F = f2, E = (x, d = 2) => x.toExponential(d).replace(/e\+?(-?)(\d+)/, (_, s, p) => " \u00d7 10^" + (s ? "\u2212" : "") + p).replace("-", "\u2212"), R = (a) => a[Math.floor(Math.random() * a.length)];
export default function build(ctx) {
  const k = calc(ctx, {
    st: {},
    sliders: [{ key: "a", label: "R\\u2081", min: 100, max: 1000, step: 10, value: 400, unit: "\\u03a9", d: 0 }, { key: "b", label: "R\\u2082", min: 100, max: 1000, step: 10, value: 500, unit: "\\u03a9", d: 0 }],
    cuts: [
    { id: "try", label: "Voltmeter: tap to check", tap: (st, c) => { const v = 9 * st.b / (st.a + st.b); return Math.abs(v - 5) < 0.02 ? "Exactly 5 V!" : "Keep trying."; } }],
    show: (st) => `\u0394V\u2082 = 9 \u00d7 R\u2082/(R\u2081 + R\u2082) = ${F(9 * st.b / (st.a + st.b), 2)} V`,
  });
  ctx.art.touchable(["try"]);
  return { destroy() {} };
}
