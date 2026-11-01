// Neutral rod: Move a negative object closer to a neutral rod.
import { calc, f2 } from "../kit.js";
const F = f2, E = (x, d = 2) => x.toExponential(d).replace(/e\+?(-?)(\d+)/, (_, s, p) => " \u00d7 10^" + (s ? "\u2212" : "") + p).replace("-", "\u2212"), R = (a) => a[Math.floor(Math.random() * a.length)];
export default function build(ctx) {
  const k = calc(ctx, {
    st: {},
    sliders: [{ key: "d", label: "Distance", min: 1, max: 20, step: 1, value: 10, unit: "cm", d: 0 }],
    cuts: [
    { id: "try", label: "Rod: tap to explain", tap: (st, c) => { return "Electrons are pushed to the far end; the near end is positive, so it's attracted."; } }],
    show: (st) => `charge separation \u221d 1/d\u00b2: ${F(100 / st.d ** 2, 2)} (units)`,
  });
  ctx.art.touchable(["try"]);
  return { destroy() {} };
}
