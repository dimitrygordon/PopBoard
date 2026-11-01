// Star: Tap to match the next element.
import { calc, f2 } from "../kit.js";
const F = f2, E = (x, d = 2) => x.toExponential(d).replace(/e\+?(-?)(\d+)/, (_, s, p) => " \u00d7 10^" + (s ? "\u2212" : "") + p).replace("-", "\u2212"), R = (a) => a[Math.floor(Math.random() * a.length)];
export default function build(ctx) {
  const k = calc(ctx, {
    st: { i: 0, N: ["hydrogen", "helium", "sodium", "calcium"] },
    sliders: [],
    cuts: [
    { id: "try", label: "Spectrum: tap for the next", tap: (st, c) => { st.i = (st.i + 1) % 4; return ""; } }],
    show: (st) => `${st.N[st.i]}: matching dark lines, in the star`,
  });
  ctx.art.touchable(["try"]);
  return { destroy() {} };
}
