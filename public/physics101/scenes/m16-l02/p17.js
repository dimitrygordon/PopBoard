// Example Problem 2: r 20.0, x_o 30.0: x_i 15.0 cm, h_i -1.0 cm.
import { calc, f2 } from "../kit.js";
const F = f2, E = (x, d = 2) => x.toExponential(d).replace(/e\+?(-?)(\d+)/, (_, s, p) => " \u00d7 10^" + (s ? "\u2212" : "") + p).replace("-", "\u2212"), R = (a) => a[Math.floor(Math.random() * a.length)];
export default function build(ctx) {
  const k = calc(ctx, {
    st: {},
    sliders: [{ key: "r", label: "r", min: 10, max: 40, step: 1, value: 20, unit: "cm", d: 0 }, { key: "x", label: "x_o", min: 5, max: 60, step: 1, value: 30, unit: "cm", d: 0 }],
    cuts: [
    { id: "try", label: "Image: tap for the book's values", tap: (st, c) => { st.r = 20; st.x = 30; c.r.set(20); c.x.set(30); return "x_i = 15.0 cm, h_i = \u22121.0 cm: real, inverted, half size."; } }],
    show: (st) => (() => { const f = st.r / 2; if (st.x === f) return "at F: no image"; const xi = f * st.x / (st.x - f); return `x_i = ${F(xi, 1)} cm\nh_i = ${F(-xi * 2 / st.x, 2)} cm`; })(),
  });
  ctx.art.touchable(["try"]);
  return { destroy() {} };
}
