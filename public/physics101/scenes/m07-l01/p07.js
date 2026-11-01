// Comet on a stretched ellipse with perihelion 0.6 AU (Halley-like). a = T^(2/3) AU from Kepler's third law; aphelion = 2a - 0.6.
import { calc, f2 } from "../kit.js";
const F = f2, E = (x, d = 2) => x.toExponential(d).replace(/e\+?(-?)(\d+)/, (_, s, p) => " \u00d7 10^" + (s ? "\u2212" : "") + p).replace("-", "\u2212"), R = (a) => a[Math.floor(Math.random() * a.length)];
export default function build(ctx) {
  const k = calc(ctx, {
    st: { far: false },
    sliders: [{ key: "T", label: "Period", min: 10, max: 200, step: 5, value: 75, unit: "years", d: 0 }],
    cuts: [
    { id: "comet", label: "Comet: tap to move it near or far", tap: (st, c) => { st.far = !st.far; return st.far ? "Far from the Sun it crawls along for years." : "Near the Sun it whips past in weeks."; } }],
    show: (st) => (() => { const a = st.T ** (2 / 3), q = 0.6, Q = 2 * a - q; return `a = ${F(a, 1)} AU, nearest ${F(q, 1)} AU, farthest ${F(Q, 1)} AU\n${st.far ? "far end: slowest" : "near the Sun: fastest"} (speed ratio ${F(Q / q, 0)} : 1)`; })(),
  });
  ctx.art.touchable(["comet"]);
  return { destroy() {} };
}
