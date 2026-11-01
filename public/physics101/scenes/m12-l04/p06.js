// Three bars: Heat 1.00 m bars and compare \u0394L.
import { calc, f2 } from "../kit.js";
const F = f2, E = (x, d = 2) => x.toExponential(d).replace(/e\+?(-?)(\d+)/, (_, s, p) => " \u00d7 10^" + (s ? "\u2212" : "") + p).replace("-", "\u2212"), R = (a) => a[Math.floor(Math.random() * a.length)];
export default function build(ctx) {
  const k = calc(ctx, {
    st: {},
    sliders: [{ key: "d", label: "\\u0394T", min: 0, max: 200, step: 5, value: 100, unit: "\\u00b0C", d: 0 }],
    cuts: [
    { id: "bars", label: "\\u0394L: tap to explain", tap: (st, c) => { return "\u0394L = \u03b1L\u2081\u0394T: bigger \u03b1, bigger growth."; } }],
    show: (st) => `aluminum: ${F(25e-6 * st.d * 1000, 2)} mm\ncopper: ${F(17e-6 * st.d * 1000, 2)} mm\novenproof glass: ${F(3e-6 * st.d * 1000, 2)} mm`,
  });
  ctx.art.touchable(["bars"]);
  return { destroy() {} };
}
