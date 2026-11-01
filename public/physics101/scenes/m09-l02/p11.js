// L = I omega constant: I 1.5 out, 0.60 in, L = 3.0 (sandbox).
import { calc, f2 } from "../kit.js";
const F = f2, E = (x, d = 2) => x.toExponential(d).replace(/e\+?(-?)(\d+)/, (_, s, p) => " \u00d7 10^" + (s ? "\u2212" : "") + p).replace("-", "\u2212"), R = (a) => a[Math.floor(Math.random() * a.length)];
export default function build(ctx) {
  const k = calc(ctx, {
    st: {},
    sliders: [{ key: "I", label: "Moment of inertia", min: 0.5, max: 2, step: 0.1, value: 1.5, unit: "kg\\u00b7m\\u00b2", d: 1 }],
    cuts: [
    { id: "arms", label: "Arms: tap to pull the arms in or out", tap: (st, c) => { st.I = st.I > 1 ? 0.6 : 1.5; c.I.set(st.I); return ""; } }],
    show: (st) => `\u03c9 = L / I = 3.0 / ${F(st.I, 1)} = ${F(3 / st.I, 1)} rad/s`,
  });
  ctx.art.touchable(["arms"]);
  return { destroy() {} };
}
