// Example Problem 5: 32.0 cm: x_i 11 cm, h_i -1.0 cm.
import { calc, f2 } from "../kit.js";
const F = f2, E = (x, d = 2) => x.toExponential(d).replace(/e\+?(-?)(\d+)/, (_, s, p) => " \u00d7 10^" + (s ? "\u2212" : "") + p).replace("-", "\u2212"), R = (a) => a[Math.floor(Math.random() * a.length)];
export default function build(ctx) {
  const k = calc(ctx, {
    st: {},
    sliders: [{ key: "x", label: "x_o", min: 9, max: 60, step: 1, value: 32, unit: "cm", d: 0 }],
    cuts: [
    { id: "try", label: "Image: tap for the book's 32.0 cm", tap: (st, c) => { st.x = 32; c.x.set(32); return "x_i \u2248 11 cm, h_i \u2248 \u22121.0 cm: inverted and smaller."; } }],
    show: (st) => (() => { const xi = 8 * st.x / (st.x - 8); return `x_i = ${F(xi, 1)} cm\nh_i = ${F(-xi * 3 / st.x, 2)} cm`; })(),
  });
  ctx.art.touchable(["try"]);
  return { destroy() {} };
}
