// B and T: Tap to step through stacking, discharging, and splitting the strips.
import { calc, f2 } from "../kit.js";
const F = f2, E = (x, d = 2) => x.toExponential(d).replace(/e\+?(-?)(\d+)/, (_, s, p) => " \u00d7 10^" + (s ? "\u2212" : "") + p).replace("-", "\u2212"), R = (a) => a[Math.floor(Math.random() * a.length)];
export default function build(ctx) {
  const k = calc(ctx, {
    st: { s: 0, N: ["stack strip T on strip B", "run a finger over them to discharge", "pull them apart quickly", "bring them close: they attract"] },
    sliders: [],
    cuts: [
    { id: "try", label: "Strips: tap for the next step", tap: (st, c) => { st.s = (st.s + 1) % 4; return st.s === 3 ? "Unlike charges attract." : ""; } }],
    show: (st) => st.N[st.s],
  });
  ctx.art.touchable(["try"]);
  return { destroy() {} };
}
