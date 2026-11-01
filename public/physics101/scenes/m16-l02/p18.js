// Example Problem 3: 5.0 m: x_i -0.45 m, h_i 0.18 m.
import { calc, f2 } from "../kit.js";
const F = f2, E = (x, d = 2) => x.toExponential(d).replace(/e\+?(-?)(\d+)/, (_, s, p) => " \u00d7 10^" + (s ? "\u2212" : "") + p).replace("-", "\u2212"), R = (a) => a[Math.floor(Math.random() * a.length)];
export default function build(ctx) {
  const k = calc(ctx, {
    st: {},
    sliders: [{ key: "x", label: "Distance", min: 0.5, max: 10, step: 0.1, value: 5, unit: "m", d: 1 }],
    cuts: [
    { id: "try", label: "Forklift: tap for the book's 5.0 m", tap: (st, c) => { st.x = 5; c.x.set(5); return "x_i = \u22120.45 m, h_i = 0.18 m."; } }],
    show: (st) => (() => { const xi = -0.5 * st.x / (st.x + 0.5); return `x_i = ${F(xi, 2)} m\nh_i = ${F(-xi * 2 / st.x, 2)} m, upright`; })(),
  });
  ctx.art.touchable(["try"]);
  return { destroy() {} };
}
