// Move the wire: Tap to move the wire.
import { calc, f2 } from "../kit.js";
const F = f2, E = (x, d = 2) => x.toExponential(d).replace(/e\+?(-?)(\d+)/, (_, s, p) => " \u00d7 10^" + (s ? "\u2212" : "") + p).replace("-", "\u2212"), R = (a) => a[Math.floor(Math.random() * a.length)];
export default function build(ctx) {
  const k = calc(ctx, {
    st: { i: 0, N: ["up: meter swings one way", "down: meter swings the other way", "not moving: meter reads zero"] },
    sliders: [],
    cuts: [
    { id: "try", label: "Wire: tap for the next motion", tap: (st, c) => { st.i = (st.i + 1) % 3; return ""; } }],
    show: (st) => st.N[st.i],
  });
  ctx.art.touchable(["try"]);
  return { destroy() {} };
}
