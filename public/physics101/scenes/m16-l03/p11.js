// Mirage: Turn up the road temperature.
import { calc, f2 } from "../kit.js";
const F = f2, E = (x, d = 2) => x.toExponential(d).replace(/e\+?(-?)(\d+)/, (_, s, p) => " \u00d7 10^" + (s ? "\u2212" : "") + p).replace("-", "\u2212"), R = (a) => a[Math.floor(Math.random() * a.length)];
export default function build(ctx) {
  const k = calc(ctx, {
    st: {},
    sliders: [{ key: "t", label: "Road temperature", min: 20, max: 60, step: 1, value: 45, unit: "\\u00b0C", d: 0 }],
    cuts: [
    { id: "try", label: "Ray: tap to explain", tap: (st, c) => { return "Hot air near the road has lower n, so rays curve upward."; } }],
    show: (st) => st.t > 35 ? "the ray curves up: a fake puddle appears" : "not hot enough for a mirage",
  });
  ctx.art.touchable(["try"]);
  return { destroy() {} };
}
