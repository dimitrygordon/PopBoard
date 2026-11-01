// Dish: Aim the dish.
import { calc, f2 } from "../kit.js";
const F = f2, E = (x, d = 2) => x.toExponential(d).replace(/e\+?(-?)(\d+)/, (_, s, p) => " \u00d7 10^" + (s ? "\u2212" : "") + p).replace("-", "\u2212"), R = (a) => a[Math.floor(Math.random() * a.length)];
export default function build(ctx) {
  const k = calc(ctx, {
    st: {},
    sliders: [{ key: "a", label: "Aim error", min: 0, max: 20, step: 1, value: 5, unit: "\\u00b0", d: 0 }],
    cuts: [
    { id: "try", label: "Dish: tap to explain", tap: (st, c) => { return "Only on target do rays focus on the horn."; } }],
    show: (st) => st.a <= 1 ? "rays focus on the horn: strong signal" : "rays miss the horn",
  });
  ctx.art.touchable(["try"]);
  return { destroy() {} };
}
