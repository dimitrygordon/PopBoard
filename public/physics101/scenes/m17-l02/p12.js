// Aperture: Resize the circular aperture (\u03bb = 550 nm, L = 1.0 m).
import { calc, f2 } from "../kit.js";
const F = f2, E = (x, d = 2) => x.toExponential(d).replace(/e\+?(-?)(\d+)/, (_, s, p) => " \u00d7 10^" + (s ? "\u2212" : "") + p).replace("-", "\u2212"), R = (a) => a[Math.floor(Math.random() * a.length)];
export default function build(ctx) {
  const k = calc(ctx, {
    st: {},
    sliders: [{ key: "D", label: "D", min: 0.1, max: 5, step: 0.1, value: 1, unit: "mm", d: 1 }],
    cuts: [
    { id: "try", label: "Rings: tap to explain", tap: (st, c) => { return "Smaller opening, wider rings."; } }],
    show: (st) => `first dark ring x\u2081 = 1.22\u03bbL/D = ${F(1.22 * 550e-9 / (st.D * 1e-3) * 1000, 2)} mm`,
  });
  ctx.art.touchable(["try"]);
  return { destroy() {} };
}
