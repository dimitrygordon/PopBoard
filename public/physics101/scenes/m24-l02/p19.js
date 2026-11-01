// Moderator: Tap to toggle the moderator.
import { calc, f2 } from "../kit.js";
const F = f2, E = (x, d = 2) => x.toExponential(d).replace(/e\+?(-?)(\d+)/, (_, s, p) => " \u00d7 10^" + (s ? "\u2212" : "") + p).replace("-", "\u2212"), R = (a) => a[Math.floor(Math.random() * a.length)];
export default function build(ctx) {
  const k = calc(ctx, {
    st: { m: 0 },
    sliders: [],
    cuts: [
    { id: "try", label: "Neutrons: tap to toggle", tap: (st, c) => { st.m = 1 - st.m; return ""; } }],
    show: (st) => st.m ? "slowed: fission much more likely" : "fast: fission rare",
  });
  ctx.art.touchable(["try"]);
  return { destroy() {} };
}
