// Bands: Slide the atoms closer.
import { calc, f2 } from "../kit.js";
const F = f2, E = (x, d = 2) => x.toExponential(d).replace(/e\+?(-?)(\d+)/, (_, s, p) => " \u00d7 10^" + (s ? "\u2212" : "") + p).replace("-", "\u2212"), R = (a) => a[Math.floor(Math.random() * a.length)];
export default function build(ctx) {
  const k = calc(ctx, {
    st: {},
    sliders: [{ key: "d", label: "Spacing", min: 0.2, max: 2, step: 0.1, value: 2, unit: "nm", d: 1 }],
    cuts: [
    { id: "try", label: "Levels: tap to explain", tap: (st, c) => { return "Close neighbors split each level into a band."; } }],
    show: (st) => st.d > 1.2 ? "separate atoms: single sharp levels" : `levels spread into bands ${F((1.2 - st.d) * 5, 1)} eV wide`,
  });
  ctx.art.touchable(["try"]);
  return { destroy() {} };
}
