// Flip: Tap to flip one pulse.
import { calc, f2 } from "../kit.js";
const F = f2, E = (x, d = 2) => x.toExponential(d).replace(/e\+?(-?)(\d+)/, (_, s, p) => " \u00d7 10^" + (s ? "\u2212" : "") + p).replace("-", "\u2212"), R = (a) => a[Math.floor(Math.random() * a.length)];
export default function build(ctx) {
  const k = calc(ctx, {
    st: { i: 0 },
    sliders: [],
    cuts: [
    { id: "flip", label: "Node or antinode: tap to flip a pulse", tap: (st, c) => { st.i = 1 - st.i; return ""; } }],
    show: (st) => st.i ? "+2 cm and \u22122 cm meet: 0 cm, a node (destructive)" : "+2 cm and +2 cm meet: 4 cm, an antinode (constructive)",
  });
  ctx.art.touchable(["flip"]);
  return { destroy() {} };
}
