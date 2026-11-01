// Concave lens: Move an object in front of a concave lens (f = \u221210 cm).
import { calc, f2 } from "../kit.js";
const F = f2, E = (x, d = 2) => x.toExponential(d).replace(/e\+?(-?)(\d+)/, (_, s, p) => " \u00d7 10^" + (s ? "\u2212" : "") + p).replace("-", "\u2212"), R = (a) => a[Math.floor(Math.random() * a.length)];
export default function build(ctx) {
  const k = calc(ctx, {
    st: {},
    sliders: [{ key: "x", label: "x_o", min: 2, max: 60, step: 1, value: 20, unit: "cm", d: 0 }],
    cuts: [
    { id: "try", label: "Image: tap to explain", tap: (st, c) => { return "Always virtual, upright, reduced."; } }],
    show: (st) => `x_i = ${F(-10 * st.x / (st.x + 10), 1)} cm, m = ${F(10 / (st.x + 10), 2)}`,
  });
  ctx.art.touchable(["try"]);
  return { destroy() {} };
}
