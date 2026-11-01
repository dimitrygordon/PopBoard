// Mirror size: Tap to compare telescope mirrors.
import { calc, f2 } from "../kit.js";
const F = f2, E = (x, d = 2) => x.toExponential(d).replace(/e\+?(-?)(\d+)/, (_, s, p) => " \u00d7 10^" + (s ? "\u2212" : "") + p).replace("-", "\u2212"), R = (a) => a[Math.floor(Math.random() * a.length)];
export default function build(ctx) {
  const k = calc(ctx, {
    st: { i: 0, N: ["25 cm", "2.4 m (Hubble)", "6.5 m (Webb)"], D: [0.25, 2.4, 6.5] },
    sliders: [],
    cuts: [
    { id: "try", label: "Mirror: tap for the next size", tap: (st, c) => { st.i = (st.i + 1) % 3; return "Light collected goes as diameter squared."; } }],
    show: (st) => `${st.N[st.i]}: ${F((st.D[st.i] / 0.25) ** 2, 0)} \u00d7 the light of a 25 cm mirror`,
  });
  ctx.art.touchable(["try"]);
  return { destroy() {} };
}
