// Example Problem 2: 555 nm: d = 95.7 nm.
import { calc, f2 } from "../kit.js";
const F = f2, E = (x, d = 2) => x.toExponential(d).replace(/e\+?(-?)(\d+)/, (_, s, p) => " \u00d7 10^" + (s ? "\u2212" : "") + p).replace("-", "\u2212"), R = (a) => a[Math.floor(Math.random() * a.length)];
export default function build(ctx) {
  const k = calc(ctx, {
    st: {},
    sliders: [{ key: "d", label: "Thickness", min: 0, max: 200, step: 0.5, value: 95.7, unit: "nm", d: 1 }],
    cuts: [
    { id: "try", label: "Film: tap for the book's minimum", tap: (st, c) => { st.d = 95.7; c.d.set(95.7); return "d = \u03bb/4n_oil = 95.7 nm."; } }],
    show: (st) => `bright wavelength: ${F(4 * 1.45 * st.d, 0)} nm` + (Math.abs(st.d - 95.7) < 1 ? " (yellow-green)" : ""),
  });
  ctx.art.touchable(["try"]);
  return { destroy() {} };
}
