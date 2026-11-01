// Thin plate 1.0 kg, 0.25 m wide: about the center (1/12) m w^2, about an edge (1/3) m w^2.
import { calc, f2 } from "../kit.js";
const F = f2, E = (x, d = 2) => x.toExponential(d).replace(/e\+?(-?)(\d+)/, (_, s, p) => " \u00d7 10^" + (s ? "\u2212" : "") + p).replace("-", "\u2212"), R = (a) => a[Math.floor(Math.random() * a.length)];
export default function build(ctx) {
  const k = calc(ctx, {
    st: { e: true },
    sliders: [],
    cuts: [
    { id: "book", label: "Book: tap to move the axis", tap: (st, c) => { st.e = !st.e; return st.e ? "Axis at the edge: four times harder to spin." : "Axis at the center: easier to spin."; } }],
    show: (st) => `axis at the ${st.e ? "edge" : "center"}: I = ${st.e ? "(1/3)" : "(1/12)"} mw\u00b2 = ${F((st.e ? 1 / 3 : 1 / 12) * 0.0625, 4)} kg\u00b7m\u00b2`,
  });
  ctx.art.touchable(["book"]);
  return { destroy() {} };
}
