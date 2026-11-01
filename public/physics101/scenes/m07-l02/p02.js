// Low orbit just above Earth: v = sqrt(G m_E / r_E) = 7.9 km/s.
import { calc, f2 } from "../kit.js";
const F = f2, E = (x, d = 2) => x.toExponential(d).replace(/e\+?(-?)(\d+)/, (_, s, p) => " \u00d7 10^" + (s ? "\u2212" : "") + p).replace("-", "\u2212"), R = (a) => a[Math.floor(Math.random() * a.length)];
export default function build(ctx) {
  const k = calc(ctx, {
    st: {},
    sliders: [{ key: "v", label: "Launch speed", min: 1, max: 9, step: 0.1, value: 5, unit: "km/s", d: 1 }],
    cuts: [
    { id: "v", label: "Cannon: tap to fire", tap: (st, c) => { return st.v >= 7.9 ? "The ground curves away as fast as the ball falls: orbit." : `It falls back to Earth${st.v > 6 ? " far away" : " nearby"}.`; } }],
    show: (st) => st.v >= 7.9 ? `${F(st.v, 1)} km/s: orbit (needs 7.9 km/s)` : `${F(st.v, 1)} km/s: lands ${st.v > 6 ? "far away" : "near the cannon"}`,
  });
  ctx.art.touchable(["v"]);
  return { destroy() {} };
}
