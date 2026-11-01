// Shallow plate: Tap to slide the plate in or out (deep 0.30 m/s, shallow 0.15 m/s, 5.0 Hz).
import { calc, f2 } from "../kit.js";
const F = f2, E = (x, d = 2) => x.toExponential(d).replace(/e\+?(-?)(\d+)/, (_, s, p) => " \u00d7 10^" + (s ? "\u2212" : "") + p).replace("-", "\u2212"), R = (a) => a[Math.floor(Math.random() * a.length)];
export default function build(ctx) {
  const k = calc(ctx, {
    st: { i: 0 },
    sliders: [],
    cuts: [
    { id: "plate", label: "Wavelength: tap to toggle", tap: (st, c) => { st.i = 1 - st.i; return st.i ? "Waves slow and bend at the edge: refraction." : ""; } }],
    show: (st) => st.i ? "over the plate: v = 0.15 m/s, \u03bb = 3.0 cm" : "deep water: v = 0.30 m/s, \u03bb = 6.0 cm",
  });
  ctx.art.touchable(["plate"]);
  return { destroy() {} };
}
