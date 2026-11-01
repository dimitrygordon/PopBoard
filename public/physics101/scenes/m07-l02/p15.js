// Two planes start 1000 km apart at the equator, both fly due north; gap = 1000 cos(latitude).
import { calc, f2 } from "../kit.js";
const F = f2, E = (x, d = 2) => x.toExponential(d).replace(/e\+?(-?)(\d+)/, (_, s, p) => " \u00d7 10^" + (s ? "\u2212" : "") + p).replace("-", "\u2212"), R = (a) => a[Math.floor(Math.random() * a.length)];
export default function build(ctx) {
  const k = calc(ctx, {
    st: {},
    sliders: [{ key: "lat", label: "Latitude", min: 0, max: 90, step: 5, value: 0, unit: "\\u00b0", d: 0 }],
    cuts: [
    { id: "fly", label: "Fly: tap to fly 30\\u00b0 farther north", tap: (st, c) => { st.lat = st.lat >= 90 ? 0 : st.lat + 30; c.lat.set(st.lat); return st.lat === 90 ? "They meet at the pole without ever turning." : ""; } }],
    show: (st) => `latitude ${st.lat}\u00b0: gap = ${F(1000 * Math.cos(st.lat * Math.PI / 180), 0)} km`,
  });
  ctx.art.touchable(["fly"]);
  return { destroy() {} };
}
