// Altimeter: Change the return time.
import { calc, f2 } from "../kit.js";
const F = f2, E = (x, d = 2) => x.toExponential(d).replace(/e\+?(-?)(\d+)/, (_, s, p) => " \u00d7 10^" + (s ? "\u2212" : "") + p).replace("-", "\u2212"), R = (a) => a[Math.floor(Math.random() * a.length)];
export default function build(ctx) {
  const k = calc(ctx, {
    st: {},
    sliders: [{ key: "t", label: "Return time", min: 6.6, max: 6.8, step: 0.005, value: 6.7, unit: "ms", d: 3 }],
    cuts: [
    { id: "try", label: "Map: tap to explain", tap: (st, c) => { return "Longer return, lower ground."; } }],
    show: (st) => `distance = ${F(3e8 * st.t / 1000 / 2 / 1000, 2)} km`,
  });
  ctx.art.touchable(["try"]);
  return { destroy() {} };
}
