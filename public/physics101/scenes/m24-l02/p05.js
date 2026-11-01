// Beta: Tap to flip a neutron.
import { calc, f2 } from "../kit.js";
const F = f2, E = (x, d = 2) => x.toExponential(d).replace(/e\+?(-?)(\d+)/, (_, s, p) => " \u00d7 10^" + (s ? "\u2212" : "") + p).replace("-", "\u2212"), R = (a) => a[Math.floor(Math.random() * a.length)];
export default function build(ctx) {
  const k = calc(ctx, {
    st: { s: 0 },
    sliders: [],
    cuts: [
    { id: "try", label: "Nucleus: tap to flip", tap: (st, c) => { st.s = 1 - st.s; return ""; } }],
    show: (st) => st.s ? "n \u2192 p + e\u207b + antineutrino: Z up 1, charge conserved" : "before",
  });
  ctx.art.touchable(["try"]);
  return { destroy() {} };
}
