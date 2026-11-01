// Cavity: Resize the cavity.
import { calc, f2 } from "../kit.js";
const F = f2, E = (x, d = 2) => x.toExponential(d).replace(/e\+?(-?)(\d+)/, (_, s, p) => " \u00d7 10^" + (s ? "\u2212" : "") + p).replace("-", "\u2212"), R = (a) => a[Math.floor(Math.random() * a.length)];
export default function build(ctx) {
  const k = calc(ctx, {
    st: {},
    sliders: [{ key: "l", label: "Size", min: 1, max: 10, step: 0.5, value: 6, unit: "cm", d: 1 }],
    cuts: [
    { id: "try", label: "Cavity: tap to explain", tap: (st, c) => { return "Smaller cavity, higher frequency."; } }],
    show: (st) => `f \u2248 c/2L = ${F(3e8 / (2 * st.l / 100) / 1e9, 2)} GHz`,
  });
  ctx.art.touchable(["try"]);
  return { destroy() {} };
}
