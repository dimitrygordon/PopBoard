// Two pulses: Slide time as two 2 cm pulses meet.
import { calc, f2 } from "../kit.js";
const F = f2, E = (x, d = 2) => x.toExponential(d).replace(/e\+?(-?)(\d+)/, (_, s, p) => " \u00d7 10^" + (s ? "\u2212" : "") + p).replace("-", "\u2212"), R = (a) => a[Math.floor(Math.random() * a.length)];
export default function build(ctx) {
  const k = calc(ctx, {
    st: {},
    sliders: [{ key: "t", label: "Time", min: 0, max: 2, step: 0.1, value: 0, unit: "s", d: 1 }],
    cuts: [
    { id: "two", label: "Sum: tap to explain", tap: (st, c) => { return "Where they overlap, the displacements add."; } }],
    show: (st) => Math.abs(st.t - 1) < 0.15 ? "overlapping: 2 cm + 2 cm = 4 cm" : "apart: each 2 cm, they pass through unchanged",
  });
  ctx.art.touchable(["two"]);
  return { destroy() {} };
}
