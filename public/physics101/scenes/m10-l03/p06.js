// Coaster hills: Set the second hill's height. The car (starting at rest on a 30 m hill) clears hills lower than its start.
import { calc, f2 } from "../kit.js";
const F = f2, E = (x, d = 2) => x.toExponential(d).replace(/e\+?(-?)(\d+)/, (_, s, p) => " \u00d7 10^" + (s ? "\u2212" : "") + p).replace("-", "\u2212"), R = (a) => a[Math.floor(Math.random() * a.length)];
export default function build(ctx) {
  const k = calc(ctx, {
    st: {},
    sliders: [{ key: "h", label: "Second hill", min: 5, max: 40, step: 1, value: 20, unit: "m", d: 0 }],
    cuts: [
    { id: "hill", label: "Hill: tap to send the car", tap: (st, c) => { return st.h < 30 ? `It clears the hill with ${F(Math.sqrt(19.6 * (30 - st.h)), 1)} m/s to spare.` : "It rolls back: it cannot climb higher than it started."; } }],
    show: (st) => st.h < 30 ? `top of hill 2: v = \u221a(2g(30 \u2212 ${st.h})) = ${F(Math.sqrt(19.6 * (30 - st.h)), 1)} m/s` : `hill ${st.h} m is not lower than 30 m: no`,
  });
  ctx.art.touchable(["hill"]);
  return { destroy() {} };
}
