// Pendulum: Change the length. Mass and small amplitudes don't matter.
import { calc, f2 } from "../kit.js";
const F = f2, E = (x, d = 2) => x.toExponential(d).replace(/e\+?(-?)(\d+)/, (_, s, p) => " \u00d7 10^" + (s ? "\u2212" : "") + p).replace("-", "\u2212"), R = (a) => a[Math.floor(Math.random() * a.length)];
export default function build(ctx) {
  const k = calc(ctx, {
    st: {},
    sliders: [{ key: "l", label: "Length", min: 0.1, max: 3, step: 0.05, value: 1, unit: "m", d: 2 }, { key: "m", label: "Mass", min: 0.1, max: 2, step: 0.1, value: 0.5, unit: "kg", d: 1 }],
    cuts: [
    { id: "pend", label: "Period: tap to explain", tap: (st, c) => { return "Only length (and g) sets the period."; } }],
    show: (st) => `T = 2\u03c0\u221a(l/g) = ${F(2 * Math.PI * Math.sqrt(st.l / 9.8), 2)} s`,
  });
  ctx.art.touchable(["pend"]);
  return { destroy() {} };
}
