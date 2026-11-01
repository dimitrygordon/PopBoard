// Loops: Add loops to the spinning armature (peak 0.50 V per loop).
import { calc, f2 } from "../kit.js";
const F = f2, E = (x, d = 2) => x.toExponential(d).replace(/e\+?(-?)(\d+)/, (_, s, p) => " \u00d7 10^" + (s ? "\u2212" : "") + p).replace("-", "\u2212"), R = (a) => a[Math.floor(Math.random() * a.length)];
export default function build(ctx) {
  const k = calc(ctx, {
    st: {},
    sliders: [{ key: "n", label: "Loops", min: 1, max: 100, step: 1, value: 10, unit: "", d: 0 }],
    cuts: [
    { id: "try", label: "Armature: tap to explain", tap: (st, c) => { return "Each loop adds its EMF."; } }],
    show: (st) => `peak EMF = ${F(0.5 * st.n, 1)} V`,
  });
  ctx.art.touchable(["try"]);
  return { destroy() {} };
}
