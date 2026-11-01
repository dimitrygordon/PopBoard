// Classical: Slide time.
import { calc, f2 } from "../kit.js";
const F = f2, E = (x, d = 2) => x.toExponential(d).replace(/e\+?(-?)(\d+)/, (_, s, p) => " \u00d7 10^" + (s ? "\u2212" : "") + p).replace("-", "\u2212"), R = (a) => a[Math.floor(Math.random() * a.length)];
export default function build(ctx) {
  const k = calc(ctx, {
    st: {},
    sliders: [{ key: "t", label: "Time", min: 0, max: 10, step: 1, value: 0, unit: "\\u00d7 10\\u207b\\u00b9\\u00b9 s", d: 0 }],
    cuts: [
    { id: "try", label: "Orbit: tap to explain", tap: (st, c) => { return "Classically it should collapse; it doesn't."; } }],
    show: (st) => `radius ${F(Math.max(0, 100 - st.t * 10), 0)}%`,
  });
  ctx.art.touchable(["try"]);
  return { destroy() {} };
}
