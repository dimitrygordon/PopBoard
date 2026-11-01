// Chain: Insert the rods.
import { calc, f2 } from "../kit.js";
const F = f2, E = (x, d = 2) => x.toExponential(d).replace(/e\+?(-?)(\d+)/, (_, s, p) => " \u00d7 10^" + (s ? "\u2212" : "") + p).replace("-", "\u2212"), R = (a) => a[Math.floor(Math.random() * a.length)];
export default function build(ctx) {
  const k = calc(ctx, {
    st: {},
    sliders: [{ key: "r", label: "Rods in", min: 0, max: 100, step: 5, value: 0, unit: "%", d: 0 }],
    cuts: [
    { id: "try", label: "Reactor: tap to explain", tap: (st, c) => { return "k = 1: steady."; } }],
    show: (st) => `k \u2248 ${F(1.4 - st.r * 0.008, 2)}: ${Math.abs(1.4 - st.r * 0.008 - 1) < 0.02 ? "steady" : 1.4 - st.r * 0.008 > 1 ? "growing" : "dying"}`,
  });
  ctx.art.touchable(["try"]);
  return { destroy() {} };
}
