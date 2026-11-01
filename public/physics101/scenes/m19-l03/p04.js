// Ammeters: Drag the ammeter to a new spot in a 12 V, 24 \u03a9 series loop.
import { calc, f2 } from "../kit.js";
const F = f2, E = (x, d = 2) => x.toExponential(d).replace(/e\+?(-?)(\d+)/, (_, s, p) => " \u00d7 10^" + (s ? "\u2212" : "") + p).replace("-", "\u2212"), R = (a) => a[Math.floor(Math.random() * a.length)];
export default function build(ctx) {
  const k = calc(ctx, {
    st: {},
    sliders: [{ key: "p", label: "Spot", min: 1, max: 4, step: 1, value: 1, unit: "", d: 0 }],
    cuts: [
    { id: "try", label: "Ammeter: tap to explain", tap: (st, c) => { return "Only one path: the same current everywhere."; } }],
    show: (st) => `spot ${st.p}: 0.50 A`,
  });
  ctx.art.touchable(["try"]);
  return { destroy() {} };
}
