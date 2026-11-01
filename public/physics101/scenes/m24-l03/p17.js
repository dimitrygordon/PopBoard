// Annihilation: Change the particle mass.
import { calc, f2 } from "../kit.js";
const F = f2, E = (x, d = 2) => x.toExponential(d).replace(/e\+?(-?)(\d+)/, (_, s, p) => " \u00d7 10^" + (s ? "\u2212" : "") + p).replace("-", "\u2212"), R = (a) => a[Math.floor(Math.random() * a.length)];
export default function build(ctx) {
  const k = calc(ctx, {
    st: {},
    sliders: [{ key: "m", label: "Mass", min: 0.511, max: 938, step: 1, value: 0.511, unit: "MeV/c\\u00b2", d: 3 }],
    cuts: [
    { id: "try", label: "Pair: tap to explain", tap: (st, c) => { return "E = 2mc\u00b2."; } }],
    show: (st) => `gamma energy = ${F(2 * st.m, 1)} MeV`,
  });
  ctx.art.touchable(["try"]);
  return { destroy() {} };
}
