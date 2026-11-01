// Make a magnet: Tap for the next step.
import { calc, f2 } from "../kit.js";
const F = f2, E = (x, d = 2) => x.toExponential(d).replace(/e\+?(-?)(\d+)/, (_, s, p) => " \u00d7 10^" + (s ? "\u2212" : "") + p).replace("-", "\u2212"), R = (a) => a[Math.floor(Math.random() * a.length)];
export default function build(ctx) {
  const k = calc(ctx, {
    st: { s: 0, N: ["heat the bar in a strong field: domains align", "cool it: they stay aligned, a permanent magnet", "drop it or reheat it: domains scramble, it weakens"] },
    sliders: [],
    cuts: [
    { id: "try", label: "Bar: tap for the next step", tap: (st, c) => { st.s = (st.s + 1) % 3; return ""; } }],
    show: (st) => st.N[st.s],
  });
  ctx.art.touchable(["try"]);
  return { destroy() {} };
}
