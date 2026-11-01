// Example Problem 4: 12 mA at 6.3 V.
import { calc, f2 } from "../kit.js";
const F = f2, E = (x, d = 2) => x.toExponential(d).replace(/e\+?(-?)(\d+)/, (_, s, p) => " \u00d7 10^" + (s ? "\u2212" : "") + p).replace("-", "\u2212"), R = (a) => a[Math.floor(Math.random() * a.length)];
export default function build(ctx) {
  const k = calc(ctx, {
    st: {},
    sliders: [{ key: "v", label: "Supply", min: 1, max: 10, step: 0.1, value: 6.3, unit: "V", d: 1 }],
    cuts: [
    { id: "try", label: "Meter: tap for the book's 12 mA", tap: (st, c) => { st.v = 6.3; c.v.set(6.3); return "0.012 \u00d7 470 + 0.70 = 6.3 V."; } }],
    show: (st) => `I = ${F(Math.max(0, st.v - 0.7) / 470 * 1000, 1)} mA`,
  });
  ctx.art.touchable(["try"]);
  return { destroy() {} };
}
