// Headlights: Tilt the headlights away from straight ahead.
import { calc, f2 } from "../kit.js";
const F = f2, E = (x, d = 2) => x.toExponential(d).replace(/e\+?(-?)(\d+)/, (_, s, p) => " \u00d7 10^" + (s ? "\u2212" : "") + p).replace("-", "\u2212"), R = (a) => a[Math.floor(Math.random() * a.length)];
export default function build(ctx) {
  const k = calc(ctx, {
    st: {},
    sliders: [{ key: "t", label: "Tilt", min: 0, max: 60, step: 5, value: 0, unit: "\\u00b0", d: 0 }],
    cuts: [
    { id: "tilt", label: "Dark patches: tap to explain", tap: (st, c) => { return "Slanted light spreads over more area."; } }],
    show: (st) => `illuminance on the road falls to ${F(Math.cos(st.t * Math.PI / 180) * 100, 0)}% (\u00d7 cos \u03b8)`,
  });
  ctx.art.touchable(["tilt"]);
  return { destroy() {} };
}
