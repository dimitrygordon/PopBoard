// alpha = tau / I. Torque 2.0 N m (sandbox).
import { calc, f2 } from "../kit.js";
const F = f2, E = (x, d = 2) => x.toExponential(d).replace(/e\+?(-?)(\d+)/, (_, s, p) => " \u00d7 10^" + (s ? "\u2212" : "") + p).replace("-", "\u2212"), R = (a) => a[Math.floor(Math.random() * a.length)];
export default function build(ctx) {
  const k = calc(ctx, {
    st: { w: 1 },
    sliders: [{ key: "I", label: "Moment of inertia", min: 0.1, max: 2, step: 0.1, value: 0.5, unit: "kg\\u00b7m\\u00b2", d: 1 }],
    cuts: [
    { id: "wheel", label: "Wheel: tap to flip the torque direction", tap: (st, c) => { st.w = -st.w; return st.w > 0 ? "Torque with the spin: it speeds up." : "Torque against the spin: it slows down."; } }],
    show: (st) => `\u03b1 = \u03c4/I = ${st.w > 0 ? "+" : "\u2212"}2.0 / ${F(st.I, 1)} = ${st.w > 0 ? "" : "\u2212"}${F(2 / st.I, 1)} rad/s\u00b2`,
  });
  ctx.art.touchable(["wheel"]);
  return { destroy() {} };
}
