// Book bag: Set the push and distance. The work Fd equals the change in \u00bdmv\u00b2 for the 2.0 kg bag.
import { calc, f2 } from "../kit.js";
const F = f2, E = (x, d = 2) => x.toExponential(d).replace(/e\+?(-?)(\d+)/, (_, s, p) => " \u00d7 10^" + (s ? "\u2212" : "") + p).replace("-", "\u2212"), R = (a) => a[Math.floor(Math.random() * a.length)];
export default function build(ctx) {
  const k = calc(ctx, {
    st: {},
    sliders: [{ key: "F", label: "Push", min: 1, max: 20, step: 1, value: 8, unit: "N", d: 0 }, { key: "d", label: "Distance", min: 0.5, max: 3, step: 0.1, value: 1.5, unit: "m", d: 1 }],
    cuts: [
    { id: "bag", label: "Bag: tap to push from rest", tap: (st, c) => { return `It ends at ${F(Math.sqrt(2 * st.F * st.d / 2), 2)} meters per second.`; } }],
    show: (st) => `Fd = ${F(st.F * st.d, 1)} J = \u00bdmv\u00b2 with v = ${F(Math.sqrt(st.F * st.d), 2)} m/s`,
  });
  ctx.art.touchable(["bag"]);
  return { destroy() {} };
}
