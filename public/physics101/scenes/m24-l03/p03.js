// Linac: Adjust the flip timing.
import { calc, f2 } from "../kit.js";
const F = f2, E = (x, d = 2) => x.toExponential(d).replace(/e\+?(-?)(\d+)/, (_, s, p) => " \u00d7 10^" + (s ? "\u2212" : "") + p).replace("-", "\u2212"), R = (a) => a[Math.floor(Math.random() * a.length)];
export default function build(ctx) {
  const k = calc(ctx, {
    st: {},
    sliders: [{ key: "t", label: "Timing error", min: 0, max: 50, step: 5, value: 0, unit: "%", d: 0 }],
    cuts: [
    { id: "try", label: "Gaps: tap to explain", tap: (st, c) => { return "Flips must match the proton's arrival."; } }],
    show: (st) => st.t <= 5 ? "in step: energy grows at each gap" : "out of step",
  });
  ctx.art.touchable(["try"]);
  return { destroy() {} };
}
