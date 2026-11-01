// Disc: Shorten the wavelength.
import { calc, f2 } from "../kit.js";
const F = f2, E = (x, d = 2) => x.toExponential(d).replace(/e\+?(-?)(\d+)/, (_, s, p) => " \u00d7 10^" + (s ? "\u2212" : "") + p).replace("-", "\u2212"), R = (a) => a[Math.floor(Math.random() * a.length)];
export default function build(ctx) {
  const k = calc(ctx, {
    st: {},
    sliders: [{ key: "l", label: "\\u03bb", min: 400, max: 800, step: 5, value: 780, unit: "nm", d: 0 }],
    cuts: [
    { id: "try", label: "Spot: tap to explain", tap: (st, c) => { return "Smaller spot, more bits."; } }],
    show: (st) => `spot \u2248 ${F(st.l / 1000 * 1.2, 2)} \u00b5m, density \u00d7 ${F((780 / st.l) ** 2, 1)}`,
  });
  ctx.art.touchable(["try"]);
  return { destroy() {} };
}
