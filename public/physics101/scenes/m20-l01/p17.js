// Right hand: Tap to reverse the current.
import { calc, f2 } from "../kit.js";
const F = f2, E = (x, d = 2) => x.toExponential(d).replace(/e\+?(-?)(\d+)/, (_, s, p) => " \u00d7 10^" + (s ? "\u2212" : "") + p).replace("-", "\u2212"), R = (a) => a[Math.floor(Math.random() * a.length)];
export default function build(ctx) {
  const k = calc(ctx, {
    st: { i: 0 },
    sliders: [],
    cuts: [
    { id: "try", label: "Hand: tap to reverse", tap: (st, c) => { st.i = 1 - st.i; return ""; } }],
    show: (st) => st.i ? "current down: field circles clockwise from above" : "current up: field circles counterclockwise from above",
  });
  ctx.art.touchable(["try"]);
  return { destroy() {} };
}
