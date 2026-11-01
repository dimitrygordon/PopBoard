// Air temperature: Change the air temperature and watch sound speed change.
import { calc, f2 } from "../kit.js";
const F = f2, E = (x, d = 2) => x.toExponential(d).replace(/e\+?(-?)(\d+)/, (_, s, p) => " \u00d7 10^" + (s ? "\u2212" : "") + p).replace("-", "\u2212"), R = (a) => a[Math.floor(Math.random() * a.length)];
export default function build(ctx) {
  const k = calc(ctx, {
    st: {},
    sliders: [{ key: "t", label: "Temperature", min: -20, max: 40, step: 1, value: 20, unit: "\\u00b0C", d: 0 }],
    cuts: [
    { id: "temp", label: "Speed: tap to explain", tap: (st, c) => { return "About 0.6 m/s faster for each degree."; } }],
    show: (st) => `v \u2248 331 + 0.6T = ${F(331 + 0.6 * st.t, 0)} m/s`,
  });
  ctx.art.touchable(["temp"]);
  return { destroy() {} };
}
