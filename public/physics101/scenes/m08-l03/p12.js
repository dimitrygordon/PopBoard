// Throw across a disk: Tap to switch between the outside view and the on-disk view.
import { calc, f2 } from "../kit.js";
const F = f2, E = (x, d = 2) => x.toExponential(d).replace(/e\+?(-?)(\d+)/, (_, s, p) => " \u00d7 10^" + (s ? "\u2212" : "") + p).replace("-", "\u2212"), R = (a) => a[Math.floor(Math.random() * a.length)];
export default function build(ctx) {
  const k = calc(ctx, {
    st: { on: false },
    sliders: [],
    cuts: [
    { id: "throw", label: "Throw: tap to switch the view", tap: (st, c) => { st.on = !st.on; return ""; } }],
    show: (st) => st.on ? "on the disk: the ball curves away from the catcher" : "outside: the ball goes straight; the catcher turns away",
  });
  ctx.art.touchable(["throw"]);
  return { destroy() {} };
}
