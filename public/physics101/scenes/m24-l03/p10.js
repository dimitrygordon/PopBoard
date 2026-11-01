// Neutrino: Add decays.
import { calc, f2 } from "../kit.js";
const F = f2, E = (x, d = 2) => x.toExponential(d).replace(/e\+?(-?)(\d+)/, (_, s, p) => " \u00d7 10^" + (s ? "\u2212" : "") + p).replace("-", "\u2212"), R = (a) => a[Math.floor(Math.random() * a.length)];
export default function build(ctx) {
  const k = calc(ctx, {
    st: {},
    sliders: [{ key: "n", label: "Decays", min: 1, max: 1000, step: 10, value: 100, unit: "", d: 0 }],
    cuts: [
    { id: "try", label: "Graph: tap to explain", tap: (st, c) => { return "The missing energy: a neutrino."; } }],
    show: (st) => `average beta energy \u2248 1/3 of the maximum; missing share carried off`,
  });
  ctx.art.touchable(["try"]);
  return { destroy() {} };
}
