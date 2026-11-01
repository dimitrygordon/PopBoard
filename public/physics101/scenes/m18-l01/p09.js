// Rug: Shuffle across the rug: electrons move from rug to shoes.
import { calc, f2 } from "../kit.js";
const F = f2, E = (x, d = 2) => x.toExponential(d).replace(/e\+?(-?)(\d+)/, (_, s, p) => " \u00d7 10^" + (s ? "\u2212" : "") + p).replace("-", "\u2212"), R = (a) => a[Math.floor(Math.random() * a.length)];
export default function build(ctx) {
  const k = calc(ctx, {
    st: {},
    sliders: [{ key: "n", label: "Electrons moved", min: 0, max: 1000, step: 50, value: 200, unit: "\\u00d7 10\\u2079", d: 0 }],
    cuts: [
    { id: "try", label: "Shoes: tap to explain", tap: (st, c) => { return "Charge is conserved: transferred, not created."; } }],
    show: (st) => `shoes: \u2212${st.n} \u00d7 10\u2079 e, rug: +${st.n} \u00d7 10\u2079 e\ntotal: 0`,
  });
  ctx.art.touchable(["try"]);
  return { destroy() {} };
}
