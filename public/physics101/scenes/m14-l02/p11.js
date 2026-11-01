// Timbre: Tap to add another frequency to a 220 Hz sine wave.
import { calc, f2 } from "../kit.js";
const F = f2, E = (x, d = 2) => x.toExponential(d).replace(/e\+?(-?)(\d+)/, (_, s, p) => " \u00d7 10^" + (s ? "\u2212" : "") + p).replace("-", "\u2212"), R = (a) => a[Math.floor(Math.random() * a.length)];
export default function build(ctx) {
  const k = calc(ctx, {
    st: { n: 1 },
    sliders: [],
    cuts: [
    { id: "add", label: "Timbre: tap to add a frequency", tap: (st, c) => { st.n = st.n >= 5 ? 1 : st.n + 1; return "Same pitch, new tone color."; } }],
    show: (st) => `frequencies: ${Array.from({ length: st.n }, (_, i) => 220 * (i + 1)).join(", ")} Hz`,
  });
  ctx.art.touchable(["add"]);
  return { destroy() {} };
}
