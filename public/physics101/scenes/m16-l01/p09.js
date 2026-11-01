// Candle: Drag the 10 cm candle toward and away from the mirror.
import { calc, f2 } from "../kit.js";
const F = f2, E = (x, d = 2) => x.toExponential(d).replace(/e\+?(-?)(\d+)/, (_, s, p) => " \u00d7 10^" + (s ? "\u2212" : "") + p).replace("-", "\u2212"), R = (a) => a[Math.floor(Math.random() * a.length)];
export default function build(ctx) {
  const k = calc(ctx, {
    st: {},
    sliders: [{ key: "x", label: "x_o", min: 5, max: 60, step: 1, value: 25, unit: "cm", d: 0 }],
    cuts: [
    { id: "try", label: "Labels: tap to explain", tap: (st, c) => { return "Plane mirror: x_i = \u2212x_o, h_i = h_o."; } }],
    show: (st) => `x_o = ${st.x} cm, x_i = \u2212${st.x} cm\nh_o = 10 cm, h_i = 10 cm`,
  });
  ctx.art.touchable(["try"]);
  return { destroy() {} };
}
