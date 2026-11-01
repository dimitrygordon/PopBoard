// Ionize: Raise the final level.
import { calc, f2 } from "../kit.js";
const F = f2, E = (x, d = 2) => x.toExponential(d).replace(/e\+?(-?)(\d+)/, (_, s, p) => " \u00d7 10^" + (s ? "\u2212" : "") + p).replace("-", "\u2212"), R = (a) => a[Math.floor(Math.random() * a.length)];
export default function build(ctx) {
  const k = calc(ctx, {
    st: {},
    sliders: [{ key: "n", label: "Final n", min: 2, max: 50, step: 1, value: 2, unit: "", d: 0 }],
    cuts: [
    { id: "try", label: "Atom: tap to explain", tap: (st, c) => { return "n \u2192 \u221e: 13.6 eV, the ionization energy."; } }],
    show: (st) => `energy needed: ${F(13.6 * (1 - 1 / st.n ** 2), 2)} eV`,
  });
  ctx.art.touchable(["try"]);
  return { destroy() {} };
}
