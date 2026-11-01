// Inversions: Tap to change the material below an oil film (n = 1.45) in air.
import { calc, f2 } from "../kit.js";
const F = f2, E = (x, d = 2) => x.toExponential(d).replace(/e\+?(-?)(\d+)/, (_, s, p) => " \u00d7 10^" + (s ? "\u2212" : "") + p).replace("-", "\u2212"), R = (a) => a[Math.floor(Math.random() * a.length)];
export default function build(ctx) {
  const k = calc(ctx, {
    st: { i: 0, N: ["water (1.33)", "glass (1.52)"], n: [1.33, 1.52] },
    sliders: [],
    cuts: [
    { id: "try", label: "Layers: tap to switch", tap: (st, c) => { st.i = 1 - st.i; return "Inverted when reflecting from a higher n."; } }],
    show: (st) => `top reflection: inverted\nbottom reflection: ${st.n[st.i] > 1.45 ? "inverted" : "not inverted"} (${st.N[st.i]} below)`,
  });
  ctx.art.touchable(["try"]);
  return { destroy() {} };
}
