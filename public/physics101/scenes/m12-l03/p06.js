// Buoyant box: Lower a 0.10 m cube into water and compare the top and bottom arrows.
import { calc, f2 } from "../kit.js";
const F = f2, E = (x, d = 2) => x.toExponential(d).replace(/e\+?(-?)(\d+)/, (_, s, p) => " \u00d7 10^" + (s ? "\u2212" : "") + p).replace("-", "\u2212"), R = (a) => a[Math.floor(Math.random() * a.length)];
export default function build(ctx) {
  const k = calc(ctx, {
    st: {},
    sliders: [{ key: "d", label: "Depth of top face", min: 0, max: 2, step: 0.1, value: 0.5, unit: "m", d: 1 }],
    cuts: [
    { id: "box", label: "Arrows: tap to explain", tap: (st, c) => { return "The difference is the same at any depth: the buoyant force."; } }],
    show: (st) => `top: ${F(1000 * 9.8 * st.d * 0.01, 1)} N down, bottom: ${F(1000 * 9.8 * (st.d + 0.1) * 0.01, 1)} N up\nbuoyant force = 9.8 N`,
  });
  ctx.art.touchable(["box"]);
  return { destroy() {} };
}
