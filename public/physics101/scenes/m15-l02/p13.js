// Moving star: Set the star's speed (positive is away) for a 6.0 \u00d7 10\u00b9\u2074 Hz line.
import { calc, f2 } from "../kit.js";
const F = f2, E = (x, d = 2) => x.toExponential(d).replace(/e\+?(-?)(\d+)/, (_, s, p) => " \u00d7 10^" + (s ? "\u2212" : "") + p).replace("-", "\u2212"), R = (a) => a[Math.floor(Math.random() * a.length)];
export default function build(ctx) {
  const k = calc(ctx, {
    st: {},
    sliders: [{ key: "v", label: "Speed away", min: -3000, max: 3000, step: 100, value: 1000, unit: "km/s", d: 0 }],
    cuts: [
    { id: "star", label: "Red or blue: tap to explain", tap: (st, c) => { return st.v > 0 ? "Moving away: red shift." : st.v < 0 ? "Moving toward: blue shift." : "No shift."; } }],
    show: (st) => `f_obs = f(1 \u2213 v/c) = ${F(6 * (1 - st.v / 3e5), 3)} \u00d7 10\u00b9\u2074 Hz`,
  });
  ctx.art.touchable(["star"]);
  return { destroy() {} };
}
