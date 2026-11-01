// Energy source: Tap to pick the next power source.
import { calc, f2 } from "../kit.js";
const F = f2, E = (x, d = 2) => x.toExponential(d).replace(/e\+?(-?)(\d+)/, (_, s, p) => " \u00d7 10^" + (s ? "\u2212" : "") + p).replace("-", "\u2212"), R = (a) => a[Math.floor(Math.random() * a.length)];
export default function build(ctx) {
  const k = calc(ctx, {
    st: { i: 0, N: ["steam: fuel heats water, steam spins the turbine", "wind: moving air spins the blades", "falling water: gravity spins the turbine"] },
    sliders: [],
    cuts: [
    { id: "try", label: "Source: tap for the next one", tap: (st, c) => { st.i = (st.i + 1) % 3; return "Mechanical energy becomes electrical energy, then light."; } }],
    show: (st) => st.N[st.i],
  });
  ctx.art.touchable(["try"]);
  return { destroy() {} };
}
