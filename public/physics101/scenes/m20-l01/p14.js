// Iron bar: Slide the iron bar toward the magnet's north pole.
import { calc, f2 } from "../kit.js";
const F = f2, E = (x, d = 2) => x.toExponential(d).replace(/e\+?(-?)(\d+)/, (_, s, p) => " \u00d7 10^" + (s ? "\u2212" : "") + p).replace("-", "\u2212"), R = (a) => a[Math.floor(Math.random() * a.length)];
export default function build(ctx) {
  const k = calc(ctx, {
    st: {},
    sliders: [{ key: "d", label: "Distance", min: 1, max: 20, step: 1, value: 10, unit: "cm", d: 0 }],
    cuts: [
    { id: "try", label: "Bar: tap to explain", tap: (st, c) => { return "The near end becomes a south pole, so it's attracted."; } }],
    show: (st) => `near end: S pole, ${F(Math.min(100, 1000 / st.d ** 2), 0)}% aligned`,
  });
  ctx.art.touchable(["try"]);
  return { destroy() {} };
}
