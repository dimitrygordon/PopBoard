// kWh: Set how long a 1500 W heater runs (at 15 cents per kWh).
import { calc, f2 } from "../kit.js";
const F = f2, E = (x, d = 2) => x.toExponential(d).replace(/e\+?(-?)(\d+)/, (_, s, p) => " \u00d7 10^" + (s ? "\u2212" : "") + p).replace("-", "\u2212"), R = (a) => a[Math.floor(Math.random() * a.length)];
export default function build(ctx) {
  const k = calc(ctx, {
    st: {},
    sliders: [{ key: "h", label: "Hours", min: 0, max: 10, step: 0.5, value: 2, unit: "h", d: 1 }],
    cuts: [
    { id: "try", label: "Meter: tap to explain", tap: (st, c) => { return "1 kWh = 3.6 \u00d7 10\u2076 J."; } }],
    show: (st) => `${F(1.5 * st.h, 2)} kWh, cost $${F(1.5 * st.h * 0.15, 2)}`,
  });
  ctx.art.touchable(["try"]);
  return { destroy() {} };
}
