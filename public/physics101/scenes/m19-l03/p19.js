// Junction: Set the two branch currents leaving a junction.
import { calc, f2 } from "../kit.js";
const F = f2, E = (x, d = 2) => x.toExponential(d).replace(/e\+?(-?)(\d+)/, (_, s, p) => " \u00d7 10^" + (s ? "\u2212" : "") + p).replace("-", "\u2212"), R = (a) => a[Math.floor(Math.random() * a.length)];
export default function build(ctx) {
  const k = calc(ctx, {
    st: {},
    sliders: [{ key: "a", label: "I\\u2081", min: 0, max: 5, step: 0.5, value: 2, unit: "A", d: 1 }, { key: "b", label: "I\\u2082", min: 0, max: 5, step: 0.5, value: 3, unit: "A", d: 1 }],
    cuts: [
    { id: "try", label: "Junction: tap to check", tap: (st, c) => { return `Entering: ${F(st.a + st.b, 1)} A.`; } }],
    show: (st) => `in = out: I = I\u2081 + I\u2082`,
  });
  ctx.art.touchable(["try"]);
  return { destroy() {} };
}
