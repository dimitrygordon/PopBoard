// Headlights: Drive two headlights 1.5 m apart away from you.
import { calc, f2 } from "../kit.js";
const F = f2, E = (x, d = 2) => x.toExponential(d).replace(/e\+?(-?)(\d+)/, (_, s, p) => " \u00d7 10^" + (s ? "\u2212" : "") + p).replace("-", "\u2212"), R = (a) => a[Math.floor(Math.random() * a.length)];
export default function build(ctx) {
  const k = calc(ctx, {
    st: {},
    sliders: [{ key: "d", label: "Distance", min: 1, max: 20, step: 0.5, value: 5, unit: "km", d: 1 }],
    cuts: [
    { id: "try", label: "Road: tap to explain", tap: (st, c) => { return "Ideal eye limit: 1.22\u03bbL/D with a 5 mm pupil, about 11 km. Real eyes stop sooner."; } }],
    show: (st) => `ideal eye (5 mm pupil): ${st.d <= 11.2 ? "two lights" : "one blur"}\nreal eye: ${st.d <= 5 ? "two lights" : "one blur"}`,
  });
  ctx.art.touchable(["try"]);
  return { destroy() {} };
}
