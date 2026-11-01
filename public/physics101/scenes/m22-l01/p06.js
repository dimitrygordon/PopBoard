// Quantized: Try to set the atom's energy.
import { calc, f2 } from "../kit.js";
const F = f2, E = (x, d = 2) => x.toExponential(d).replace(/e\+?(-?)(\d+)/, (_, s, p) => " \u00d7 10^" + (s ? "\u2212" : "") + p).replace("-", "\u2212"), R = (a) => a[Math.floor(Math.random() * a.length)];
export default function build(ctx) {
  const k = calc(ctx, {
    st: {},
    sliders: [{ key: "e", label: "Requested energy", min: 0, max: 5, step: 0.1, value: 2.3, unit: "hf", d: 1 }],
    cuts: [
    { id: "try", label: "Atom: tap to explain", tap: (st, c) => { return "E = nhf, n a whole number."; } }],
    show: (st) => `allowed: ${Math.round(st.e)}hf`,
  });
  ctx.art.touchable(["try"]);
  return { destroy() {} };
}
