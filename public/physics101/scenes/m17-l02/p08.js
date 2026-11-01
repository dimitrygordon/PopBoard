// Lasers: Tap to switch discs.
import { calc, f2 } from "../kit.js";
const F = f2, E = (x, d = 2) => x.toExponential(d).replace(/e\+?(-?)(\d+)/, (_, s, p) => " \u00d7 10^" + (s ? "\u2212" : "") + p).replace("-", "\u2212"), R = (a) => a[Math.floor(Math.random() * a.length)];
export default function build(ctx) {
  const k = calc(ctx, {
    st: { i: 0, N: ["CD: 780 nm laser, 1.6 \u00b5m track spacing", "DVD: 650 nm laser, 0.74 \u00b5m", "Blu-ray: 405 nm laser, 0.32 \u00b5m"] },
    sliders: [],
    cuts: [
    { id: "try", label: "Disc: tap for the next one", tap: (st, c) => { st.i = (st.i + 1) % 3; return "Shorter wavelength, smaller spot, more data."; } }],
    show: (st) => st.N[st.i],
  });
  ctx.art.touchable(["try"]);
  return { destroy() {} };
}
