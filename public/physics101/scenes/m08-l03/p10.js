// Pebble on a ride: Tap to switch between watching from the ride and from the ground.
import { calc, f2 } from "../kit.js";
const F = f2, E = (x, d = 2) => x.toExponential(d).replace(/e\+?(-?)(\d+)/, (_, s, p) => " \u00d7 10^" + (s ? "\u2212" : "") + p).replace("-", "\u2212"), R = (a) => a[Math.floor(Math.random() * a.length)];
export default function build(ctx) {
  const k = calc(ctx, {
    st: { g: false },
    sliders: [],
    cuts: [
    { id: "ride", label: "Ride: tap to switch the view", tap: (st, c) => { st.g = !st.g; return ""; } }],
    show: (st) => st.g ? "from the ground: the pebble flies off in a straight line" : "from the ride: the pebble seems pushed outward and curves",
  });
  ctx.art.touchable(["ride"]);
  return { destroy() {} };
}
