// Activity: Set the days (iodine-131).
import { calc, f2 } from "../kit.js";
const F = f2, E = (x, d = 2) => x.toExponential(d).replace(/e\+?(-?)(\d+)/, (_, s, p) => " \u00d7 10^" + (s ? "\u2212" : "") + p).replace("-", "\u2212"), R = (a) => a[Math.floor(Math.random() * a.length)];
export default function build(ctx) {
  const k = calc(ctx, {
    st: {},
    sliders: [{ key: "t", label: "t", min: 0, max: 40, step: 1, value: 0, unit: "days", d: 0 }],
    cuts: [
    { id: "try", label: "Counter: tap to explain", tap: (st, c) => { return "Halves every 8.07 days."; } }],
    show: (st) => `${F(800 * 0.5 ** (st.t / 8.07), 0)} clicks/s`,
  });
  ctx.art.touchable(["try"]);
  return { destroy() {} };
}
