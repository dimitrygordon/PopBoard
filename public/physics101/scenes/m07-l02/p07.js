// Period at height h; geosynchronous when T = 24 h (sidereal approx), r = 4.22e7 m, h about 35,800 km.
import { calc, f2 } from "../kit.js";
const F = f2, E = (x, d = 2) => x.toExponential(d).replace(/e\+?(-?)(\d+)/, (_, s, p) => " \u00d7 10^" + (s ? "\u2212" : "") + p).replace("-", "\u2212"), R = (a) => a[Math.floor(Math.random() * a.length)];
export default function build(ctx) {
  const k = calc(ctx, {
    st: {},
    sliders: [{ key: "h", label: "Height", min: 1000, max: 45000, step: 200, value: 20000, unit: "km", d: 0 }],
    cuts: [
    { id: "geo", label: "Earth: tap to spin it one day", tap: (st, c) => { const T = 2 * Math.PI * Math.sqrt(((6.38e6 + st.h * 1e3) ** 3) / (6.67e-11 * 5.97e24)) / 3600; return Math.abs(T - 24) < 0.5 ? "It stays over the same spot: geosynchronous." : T < 24 ? "The satellite laps Earth and drifts east." : "The satellite falls behind and drifts west."; } }],
    show: (st) => `period ${F(2 * Math.PI * Math.sqrt(((6.38e6 + st.h * 1e3) ** 3) / (6.67e-11 * 5.97e24)) / 3600, 1)} h (Earth spins in 24 h)`,
  });
  ctx.art.touchable(["geo"]);
  return { destroy() {} };
}
