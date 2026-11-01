// Earth omega = 7.27e-5 rad/s, radius 6.38e6 m; distance from the axis r = R cos(latitude). Equator 464 m/s.
import { calc, f2 } from "../kit.js";
const F = f2, E = (x, d = 2) => x.toExponential(d).replace(/e\+?(-?)(\d+)/, (_, s, p) => " \u00d7 10^" + (s ? "\u2212" : "") + p).replace("-", "\u2212"), R = (a) => a[Math.floor(Math.random() * a.length)];
export default function build(ctx) {
  const k = calc(ctx, {
    st: {},
    sliders: [{ key: "lat", label: "Latitude", min: 0, max: 90, step: 5, value: 0, unit: "\\u00b0", d: 0 }],
    cuts: [
    { id: "pins", label: "Pins: tap to move 30\\u00b0 north", tap: (st, c) => { st.lat = st.lat >= 90 ? 0 : st.lat + 30; c.lat.set(st.lat); return ""; } }],
    show: (st) => `\u03c9 = 7.27 \u00d7 10^\u22125 rad/s at every latitude\nr = ${F(6380 * Math.cos(st.lat * Math.PI / 180), 0)} km, v = ${F(6.38e6 * Math.cos(st.lat * Math.PI / 180) * 7.27e-5, 0)} m/s`,
  });
  ctx.art.touchable(["pins"]);
  return { destroy() {} };
}
