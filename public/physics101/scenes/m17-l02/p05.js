// Widen: Widen the slit for 500 nm light.
import { calc, f2 } from "../kit.js";
const F = f2, E = (x, d = 2) => x.toExponential(d).replace(/e\+?(-?)(\d+)/, (_, s, p) => " \u00d7 10^" + (s ? "\u2212" : "") + p).replace("-", "\u2212"), R = (a) => a[Math.floor(Math.random() * a.length)];
export default function build(ctx) {
  const k = calc(ctx, {
    st: {},
    sliders: [{ key: "n", label: "Slit width in wavelengths", min: 2, max: 5000, step: 1, value: 50, unit: "", d: 0 }],
    cuts: [
    { id: "try", label: "Pattern: tap to explain", tap: (st, c) => { return "10 to 100 wavelengths: diffraction is easy to see."; } }],
    show: (st) => st.n < 10 ? "light spreads almost everywhere" : st.n <= 100 ? `noticeable diffraction: spread \u2248 ${F(2 * Math.asin(1 / st.n) * 180 / Math.PI, 1)}\u00b0` : "nearly a sharp shadow",
  });
  ctx.art.touchable(["try"]);
  return { destroy() {} };
}
