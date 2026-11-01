// Inverse square: Drag the sphere radius from 1 to 3 m for a 1000 lm bulb.
import { calc, f2 } from "../kit.js";
const F = f2, E = (x, d = 2) => x.toExponential(d).replace(/e\+?(-?)(\d+)/, (_, s, p) => " \u00d7 10^" + (s ? "\u2212" : "") + p).replace("-", "\u2212"), R = (a) => a[Math.floor(Math.random() * a.length)];
export default function build(ctx) {
  const k = calc(ctx, {
    st: {},
    sliders: [{ key: "r", label: "Radius", min: 1, max: 3, step: 0.1, value: 1, unit: "m", d: 1 }],
    cuts: [
    { id: "drag", label: "Lux: tap to explain", tap: (st, c) => { return "Double the distance, one fourth the illuminance."; } }],
    show: (st) => `E = ${F(1000 / (4 * Math.PI * st.r * st.r), 1)} lx`,
  });
  ctx.art.touchable(["drag"]);
  return { destroy() {} };
}
