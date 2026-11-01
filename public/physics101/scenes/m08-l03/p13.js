// Fire north or south: Tap to fire north or south from the Northern Hemisphere and see where it lands.
import { calc, f2 } from "../kit.js";
const F = f2, E = (x, d = 2) => x.toExponential(d).replace(/e\+?(-?)(\d+)/, (_, s, p) => " \u00d7 10^" + (s ? "\u2212" : "") + p).replace("-", "\u2212"), R = (a) => a[Math.floor(Math.random() * a.length)];
export default function build(ctx) {
  const k = calc(ctx, {
    st: { n: true },
    sliders: [],
    cuts: [
    { id: "fire", label: "Fire: tap to switch direction", tap: (st, c) => { st.n = !st.n; return "In the Northern Hemisphere the shot lands to the right of its target."; } }],
    show: (st) => `fired ${st.n ? "north" : "south"}: lands ${st.n ? "east" : "west"} of the target (to the right)`,
  });
  ctx.art.touchable(["fire"]);
  return { destroy() {} };
}
