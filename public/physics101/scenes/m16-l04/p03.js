// Beyond 2F: Slide the object from far away to 2F (f = 10 cm).
import { calc, f2 } from "../kit.js";
const F = f2, E = (x, d = 2) => x.toExponential(d).replace(/e\+?(-?)(\d+)/, (_, s, p) => " \u00d7 10^" + (s ? "\u2212" : "") + p).replace("-", "\u2212"), R = (a) => a[Math.floor(Math.random() * a.length)];
export default function build(ctx) {
  const k = calc(ctx, {
    st: {},
    sliders: [{ key: "x", label: "x_o", min: 20, max: 100, step: 1, value: 50, unit: "cm", d: 0 }],
    cuts: [
    { id: "try", label: "Image: tap to explain", tap: (st, c) => { return "Beyond 2F: real, inverted, reduced. At 2F: same size."; } }],
    show: (st) => `x_i = ${F(10 * st.x / (st.x - 10), 1)} cm, m = ${F(-10 / (st.x - 10), 2)}`,
  });
  ctx.art.touchable(["try"]);
  return { destroy() {} };
}
