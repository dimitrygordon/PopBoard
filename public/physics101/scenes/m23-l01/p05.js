// Gap size: Change the band gap.
import { calc, f2 } from "../kit.js";
const F = f2, E = (x, d = 2) => x.toExponential(d).replace(/e\+?(-?)(\d+)/, (_, s, p) => " \u00d7 10^" + (s ? "\u2212" : "") + p).replace("-", "\u2212"), R = (a) => a[Math.floor(Math.random() * a.length)];
export default function build(ctx) {
  const k = calc(ctx, {
    st: {},
    sliders: [{ key: "g", label: "Gap", min: 0, max: 6, step: 0.25, value: 1.1, unit: "eV", d: 2 }],
    cuts: [
    { id: "try", label: "Meter: tap to explain", tap: (st, c) => { return "Smaller gap, better conductor."; } }],
    show: (st) => st.g < 0.1 ? "conductor" : st.g < 3 ? "semiconductor" : "insulator",
  });
  ctx.art.touchable(["try"]);
  return { destroy() {} };
}
