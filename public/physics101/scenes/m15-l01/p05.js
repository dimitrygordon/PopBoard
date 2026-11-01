// Blocks: Tap to shine light on the next block.
import { calc, f2 } from "../kit.js";
const F = f2, E = (x, d = 2) => x.toExponential(d).replace(/e\+?(-?)(\d+)/, (_, s, p) => " \u00d7 10^" + (s ? "\u2212" : "") + p).replace("-", "\u2212"), R = (a) => a[Math.floor(Math.random() * a.length)];
export default function build(ctx) {
  const k = calc(ctx, {
    st: { i: 0, N: ["transparent glass: you see clearly through it", "translucent wax paper: light passes, no clear view", "opaque wood: no light passes"] },
    sliders: [],
    cuts: [
    { id: "blk", label: "What passes: tap for the next block", tap: (st, c) => { st.i = (st.i + 1) % 3; return ""; } }],
    show: (st) => st.N[st.i],
  });
  ctx.art.touchable(["blk"]);
  return { destroy() {} };
}
