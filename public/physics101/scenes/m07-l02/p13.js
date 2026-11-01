// Equivalence: accelerating at a = 2 m/s^2 feels like a backward pull; a hill gives a gravity component down the slope.
import { calc, f2 } from "../kit.js";
const F = f2, E = (x, d = 2) => x.toExponential(d).replace(/e\+?(-?)(\d+)/, (_, s, p) => " \u00d7 10^" + (s ? "\u2212" : "") + p).replace("-", "\u2212"), R = (a) => a[Math.floor(Math.random() * a.length)];
export default function build(ctx) {
  const k = calc(ctx, {
    st: { s: 0 },
    sliders: [],
    cuts: [
    { id: "drive", label: "Drive: tap to switch roads", tap: (st, c) => { st.s = 1 - st.s; return "The watermelon rolls back both times. It cannot tell acceleration from gravity."; } }],
    show: (st) => st.s ? "climbing a hill at constant speed:\ngravity pulls the melon down the slope" : "speeding up on flat ground:\nthe melon slides to the back",
  });
  ctx.art.touchable(["drive"]);
  return { destroy() {} };
}
