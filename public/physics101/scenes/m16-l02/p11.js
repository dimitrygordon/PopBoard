// Past F: Push the object toward the mirror (f = 10 cm).
import { calc, f2 } from "../kit.js";
const F = f2, E = (x, d = 2) => x.toExponential(d).replace(/e\+?(-?)(\d+)/, (_, s, p) => " \u00d7 10^" + (s ? "\u2212" : "") + p).replace("-", "\u2212"), R = (a) => a[Math.floor(Math.random() * a.length)];
export default function build(ctx) {
  const k = calc(ctx, {
    st: {},
    sliders: [{ key: "x", label: "x_o", min: 2, max: 30, step: 1, value: 15, unit: "cm", d: 0 }],
    cuts: [
    { id: "try", label: "Image: tap to explain", tap: (st, c) => { return st.x < 10 ? "Inside F: virtual, upright, enlarged." : "Beyond F: real and inverted."; } }],
    show: (st) => st.x === 10 ? "at F: no image" : `x_i = ${F(10 * st.x / (st.x - 10), 1)} cm (${st.x < 10 ? "virtual" : "real"})`,
  });
  ctx.art.touchable(["try"]);
  return { destroy() {} };
}
