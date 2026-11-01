// F to 2F: Push the object from 2F toward F (f = 10 cm).
import { calc, f2 } from "../kit.js";
const F = f2, E = (x, d = 2) => x.toExponential(d).replace(/e\+?(-?)(\d+)/, (_, s, p) => " \u00d7 10^" + (s ? "\u2212" : "") + p).replace("-", "\u2212"), R = (a) => a[Math.floor(Math.random() * a.length)];
export default function build(ctx) {
  const k = calc(ctx, {
    st: {},
    sliders: [{ key: "x", label: "x_o", min: 10, max: 20, step: 0.5, value: 15, unit: "cm", d: 1 }],
    cuts: [
    { id: "try", label: "Image: tap to explain", tap: (st, c) => { return "At F the rays leave parallel: no image."; } }],
    show: (st) => st.x === 10 ? "at F: no image" : `x_i = ${F(10 * st.x / (st.x - 10), 1)} cm, m = ${F(-10 / (st.x - 10), 2)}`,
  });
  ctx.art.touchable(["try"]);
  return { destroy() {} };
}
