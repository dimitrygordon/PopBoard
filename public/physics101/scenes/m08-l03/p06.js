// Tipping angle = atan(half-width / CM height). Tall van 0.85 m / 1.2 m; sports car 0.80 m / 0.50 m (sandbox).
import { calc, f2 } from "../kit.js";
const F = f2, E = (x, d = 2) => x.toExponential(d).replace(/e\+?(-?)(\d+)/, (_, s, p) => " \u00d7 10^" + (s ? "\u2212" : "") + p).replace("-", "\u2212"), R = (a) => a[Math.floor(Math.random() * a.length)];
export default function build(ctx) {
  const k = calc(ctx, {
    st: { v: 0, N: ["tall van", "low sports car"], w: [0.85, 0.8], h: [1.2, 0.5] },
    sliders: [],
    cuts: [
    { id: "tilt", label: "Tilt: tap to switch vehicles", tap: (st, c) => { st.v = 1 - st.v; return ""; } }],
    show: (st) => `${st.N[st.v]}: tips at ${F(Math.atan(st.w[st.v] / st.h[st.v]) * 180 / Math.PI, 0)}\u00b0`,
  });
  ctx.art.touchable(["tilt"]);
  return { destroy() {} };
}
