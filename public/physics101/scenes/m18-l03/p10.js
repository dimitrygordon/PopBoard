// Grass seed: Tap to switch between one and two charges.
import { calc, f2 } from "../kit.js";
const F = f2, E = (x, d = 2) => x.toExponential(d).replace(/e\+?(-?)(\d+)/, (_, s, p) => " \u00d7 10^" + (s ? "\u2212" : "") + p).replace("-", "\u2212"), R = (a) => a[Math.floor(Math.random() * a.length)];
export default function build(ctx) {
  const k = calc(ctx, {
    st: { i: 0 },
    sliders: [],
    cuts: [
    { id: "try", label: "Seeds: tap to switch", tap: (st, c) => { st.i = 1 - st.i; return "Seeds line up along the field, a model of it."; } }],
    show: (st) => st.i ? "two opposite charges: seeds form curves from one to the other" : "one charge: seeds point straight out",
  });
  ctx.art.touchable(["try"]);
  return { destroy() {} };
}
