// Slit: Change the slit width and tap to change color (L = 1.0 m).
import { calc, f2 } from "../kit.js";
const F = f2, E = (x, d = 2) => x.toExponential(d).replace(/e\+?(-?)(\d+)/, (_, s, p) => " \u00d7 10^" + (s ? "\u2212" : "") + p).replace("-", "\u2212"), R = (a) => a[Math.floor(Math.random() * a.length)];
export default function build(ctx) {
  const k = calc(ctx, {
    st: { i: 0, N: ["red", "blue"], L: [650, 450] },
    sliders: [{ key: "w", label: "Slit width", min: 0.02, max: 0.5, step: 0.01, value: 0.1, unit: "mm", d: 2 }],
    cuts: [
    { id: "try", label: "Light: tap to switch color", tap: (st, c) => { st.i = 1 - st.i; return ""; } }],
    show: (st) => `${st.N[st.i]}: central band 2\u03bbL/w = ${F(2 * st.L[st.i] * 1e-9 / (st.w * 1e-3) * 1000, 1)} mm`,
  });
  ctx.art.touchable(["try"]);
  return { destroy() {} };
}
