// Floating particle: Slide time and track a floating particle in a surface wave.
import { calc, f2 } from "../kit.js";
const F = f2, E = (x, d = 2) => x.toExponential(d).replace(/e\+?(-?)(\d+)/, (_, s, p) => " \u00d7 10^" + (s ? "\u2212" : "") + p).replace("-", "\u2212"), R = (a) => a[Math.floor(Math.random() * a.length)];
export default function build(ctx) {
  const k = calc(ctx, {
    st: {},
    sliders: [{ key: "t", label: "Time", min: 0, max: 1, step: 0.05, value: 0, unit: "periods", d: 2 }],
    cuts: [
    { id: "float", label: "Circle: tap to explain", tap: (st, c) => { return "Each particle traces a circle."; } }],
    show: (st) => `angle around its circle: ${F(st.t * 360, 0)}\u00b0\nnet drift: none`,
  });
  ctx.art.touchable(["float"]);
  return { destroy() {} };
}
