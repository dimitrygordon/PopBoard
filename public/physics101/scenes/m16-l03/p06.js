// Crests: Tap to send 600 nm light into the next medium.
import { calc, f2 } from "../kit.js";
const F = f2, E = (x, d = 2) => x.toExponential(d).replace(/e\+?(-?)(\d+)/, (_, s, p) => " \u00d7 10^" + (s ? "\u2212" : "") + p).replace("-", "\u2212"), R = (a) => a[Math.floor(Math.random() * a.length)];
export default function build(ctx) {
  const k = calc(ctx, {
    st: { i: 0, N: ["vacuum", "water", "glass"], n: [1, 1.33, 1.52] },
    sliders: [],
    cuts: [
    { id: "try", label: "Medium: tap for the next one", tap: (st, c) => { st.i = (st.i + 1) % 3; return "Frequency never changes at a boundary."; } }],
    show: (st) => `${st.N[st.i]}: \u03bb = ${F(600 / st.n[st.i], 0)} nm\nf = 5.0 \u00d7 10\u00b9\u2074 Hz`,
  });
  ctx.art.touchable(["try"]);
  return { destroy() {} };
}
