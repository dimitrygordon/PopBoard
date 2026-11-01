// Two springs: Tap to join a light spring to a heavier one or the reverse.
import { calc, f2 } from "../kit.js";
const F = f2, E = (x, d = 2) => x.toExponential(d).replace(/e\+?(-?)(\d+)/, (_, s, p) => " \u00d7 10^" + (s ? "\u2212" : "") + p).replace("-", "\u2212"), R = (a) => a[Math.floor(Math.random() * a.length)];
export default function build(ctx) {
  const k = calc(ctx, {
    st: { i: 0 },
    sliders: [],
    cuts: [
    { id: "join", label: "Pulses: tap to switch the order", tap: (st, c) => { st.i = 1 - st.i; return ""; } }],
    show: (st) => st.i ? "heavy to light: reflected pulse upright, transmitted pulse bigger" : "light to heavy: reflected pulse inverted, transmitted pulse smaller",
  });
  ctx.art.touchable(["join"]);
  return { destroy() {} };
}
