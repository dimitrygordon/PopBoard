// Magnification: Move a 2.0 cm object in front of a concave mirror with f = 10 cm.
import { calc, f2 } from "../kit.js";
const F = f2, E = (x, d = 2) => x.toExponential(d).replace(/e\+?(-?)(\d+)/, (_, s, p) => " \u00d7 10^" + (s ? "\u2212" : "") + p).replace("-", "\u2212"), R = (a) => a[Math.floor(Math.random() * a.length)];
export default function build(ctx) {
  const k = calc(ctx, {
    st: {},
    sliders: [{ key: "x", label: "x_o", min: 2, max: 50, step: 1, value: 30, unit: "cm", d: 0 }],
    cuts: [
    { id: "try", label: "m: tap to explain", tap: (st, c) => { return "Negative m means inverted."; } }],
    show: (st) => (() => { if (st.x === 10) return "at F: no image"; const xi = 10 * st.x / (st.x - 10), m = -xi / st.x; return `x_i = ${F(xi, 1)} cm, m = ${F(m, 2)}\nh_i = ${F(2 * m, 2)} cm (${m < 0 ? "inverted" : "upright"})`; })(),
  });
  ctx.art.touchable(["try"]);
  return { destroy() {} };
}
