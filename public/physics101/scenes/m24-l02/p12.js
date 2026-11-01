// Remaining: Set the time (carbon-14, 5730 y).
import { calc, f2 } from "../kit.js";
const F = f2, E = (x, d = 2) => x.toExponential(d).replace(/e\+?(-?)(\d+)/, (_, s, p) => " \u00d7 10^" + (s ? "\u2212" : "") + p).replace("-", "\u2212"), R = (a) => a[Math.floor(Math.random() * a.length)];
export default function build(ctx) {
  const k = calc(ctx, {
    st: {},
    sliders: [{ key: "t", label: "t", min: 0, max: 30000, step: 500, value: 5730, unit: "y", d: 0 }],
    cuts: [
    { id: "try", label: "Result: tap to explain", tap: (st, c) => { return "Remaining = (\u00bd)^(t/T)."; } }],
    show: (st) => `remaining = ${F(100 * 0.5 ** (st.t / 5730), 1)}%`,
  });
  ctx.art.touchable(["try"]);
  return { destroy() {} };
}
