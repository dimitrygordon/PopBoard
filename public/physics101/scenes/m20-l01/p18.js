// Coil: Add loops to the coil.
import { calc, f2 } from "../kit.js";
const F = f2, E = (x, d = 2) => x.toExponential(d).replace(/e\+?(-?)(\d+)/, (_, s, p) => " \u00d7 10^" + (s ? "\u2212" : "") + p).replace("-", "\u2212"), R = (a) => a[Math.floor(Math.random() * a.length)];
export default function build(ctx) {
  const k = calc(ctx, {
    st: {},
    sliders: [{ key: "n", label: "Loops", min: 1, max: 20, step: 1, value: 1, unit: "", d: 0 }],
    cuts: [
    { id: "try", label: "Coil: tap to explain", tap: (st, c) => { return "Loop fields merge into a bar-magnet field."; } }],
    show: (st) => st.n < 5 ? "separate loop fields" : "a solenoid: field like a bar magnet",
  });
  ctx.art.touchable(["try"]);
  return { destroy() {} };
}
