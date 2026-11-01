// Schematic: Tap to add the next part.
import { calc, f2 } from "../kit.js";
const F = f2, E = (x, d = 2) => x.toExponential(d).replace(/e\+?(-?)(\d+)/, (_, s, p) => " \u00d7 10^" + (s ? "\u2212" : "") + p).replace("-", "\u2212"), R = (a) => a[Math.floor(Math.random() * a.length)];
export default function build(ctx) {
  const k = calc(ctx, {
    st: { n: 0, N: ["battery: long and short lines", "wire: straight line", "switch: a break with a lever", "lamp: a circle with a loop", "resistor: a zigzag"] },
    sliders: [],
    cuts: [
    { id: "try", label: "Parts: tap to add the next part", tap: (st, c) => { st.n = (st.n + 1) % 5; return ""; } }],
    show: (st) => st.N[st.n],
  });
  ctx.art.touchable(["try"]);
  return { destroy() {} };
}
