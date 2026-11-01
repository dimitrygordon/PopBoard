// Elevator: Ride the elevator up and watch the air pressure drop (about 1.2 kPa per 100 m near the ground).
import { calc, f2 } from "../kit.js";
const F = f2, E = (x, d = 2) => x.toExponential(d).replace(/e\+?(-?)(\d+)/, (_, s, p) => " \u00d7 10^" + (s ? "\u2212" : "") + p).replace("-", "\u2212"), R = (a) => a[Math.floor(Math.random() * a.length)];
export default function build(ctx) {
  const k = calc(ctx, {
    st: {},
    sliders: [{ key: "h", label: "Height", min: 0, max: 500, step: 10, value: 0, unit: "m", d: 0 }],
    cuts: [
    { id: "elev", label: "Air pressure gauge: tap to explain", tap: (st, c) => { return "Less air above you, so less weight pressing down."; } }],
    show: (st) => `P \u2248 ${F(101.3 - 0.012 * st.h, 1)} kPa`,
  });
  ctx.art.touchable(["elev"]);
  return { destroy() {} };
}
