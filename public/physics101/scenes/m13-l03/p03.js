// Wall or ring: Tap to switch the end of the rope.
import { calc, f2 } from "../kit.js";
const F = f2, E = (x, d = 2) => x.toExponential(d).replace(/e\+?(-?)(\d+)/, (_, s, p) => " \u00d7 10^" + (s ? "\u2212" : "") + p).replace("-", "\u2212"), R = (a) => a[Math.floor(Math.random() * a.length)];
export default function build(ctx) {
  const k = calc(ctx, {
    st: { i: 0 },
    sliders: [],
    cuts: [
    { id: "wall", label: "Reflection: tap to switch ends", tap: (st, c) => { st.i = 1 - st.i; return ""; } }],
    show: (st) => st.i ? "free ring: pulse reflects upright" : "rigid wall: pulse reflects inverted",
  });
  ctx.art.touchable(["wall"]);
  return { destroy() {} };
}
