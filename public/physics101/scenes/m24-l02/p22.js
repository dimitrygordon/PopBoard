// Sun: Step the fusion chain.
import { calc, f2 } from "../kit.js";
const F = f2, E = (x, d = 2) => x.toExponential(d).replace(/e\+?(-?)(\d+)/, (_, s, p) => " \u00d7 10^" + (s ? "\u2212" : "") + p).replace("-", "\u2212"), R = (a) => a[Math.floor(Math.random() * a.length)];
export default function build(ctx) {
  const k = calc(ctx, {
    st: {},
    sliders: [{ key: "k", label: "Step", min: 1, max: 3, step: 1, value: 1, unit: "", d: 0 }],
    cuts: [
    { id: "try", label: "Chain: tap to explain", tap: (st, c) => { return "Total: 4 protons \u2192 helium-4, about 26.7 MeV."; } }],
    show: (st) => ["p + p \u2192 H-2 + e\u207a + \u03bd", "H-2 + p \u2192 He-3 + \u03b3", "He-3 + He-3 \u2192 He-4 + 2p"][st.k - 1],
  });
  ctx.art.touchable(["try"]);
  return { destroy() {} };
}
