// Stationary: Tap to pick an orbit.
import { calc, f2 } from "../kit.js";
const F = f2, E = (x, d = 2) => x.toExponential(d).replace(/e\+?(-?)(\d+)/, (_, s, p) => " \u00d7 10^" + (s ? "\u2212" : "") + p).replace("-", "\u2212"), R = (a) => a[Math.floor(Math.random() * a.length)];
export default function build(ctx) {
  const k = calc(ctx, {
    st: { n: 1 },
    sliders: [],
    cuts: [
    { id: "try", label: "Orbit: tap for the next", tap: (st, c) => { st.n = st.n % 4 + 1; return ""; } }],
    show: (st) => `n = ${st.n}: stays put, no radiation`,
  });
  ctx.art.touchable(["try"]);
  return { destroy() {} };
}
