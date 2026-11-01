// Carburetor: Speed up air through the carburetor and watch fuel drawn in.
import { calc, f2 } from "../kit.js";
const F = f2, E = (x, d = 2) => x.toExponential(d).replace(/e\+?(-?)(\d+)/, (_, s, p) => " \u00d7 10^" + (s ? "\u2212" : "") + p).replace("-", "\u2212"), R = (a) => a[Math.floor(Math.random() * a.length)];
export default function build(ctx) {
  const k = calc(ctx, {
    st: {},
    sliders: [{ key: "v", label: "Air speed", min: 0, max: 40, step: 1, value: 10, unit: "m/s", d: 0 }],
    cuts: [
    { id: "air", label: "Fuel drawn: tap to explain", tap: (st, c) => { return "Low pressure in the fast air pulls fuel up."; } }],
    show: (st) => `pressure drop = \u00bd\u03c1v\u00b2 = ${F(0.5 * 1.2 * st.v * st.v, 0)} Pa`,
  });
  ctx.art.touchable(["air"]);
  return { destroy() {} };
}
