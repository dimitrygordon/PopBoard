// Pressure: Press 100 N on different areas and watch the gauge.
import { calc, f2 } from "../kit.js";
const F = f2, E = (x, d = 2) => x.toExponential(d).replace(/e\+?(-?)(\d+)/, (_, s, p) => " \u00d7 10^" + (s ? "\u2212" : "") + p).replace("-", "\u2212"), R = (a) => a[Math.floor(Math.random() * a.length)];
export default function build(ctx) {
  const k = calc(ctx, {
    st: {},
    sliders: [{ key: "a", label: "Area", min: 0.001, max: 0.1, step: 0.001, value: 0.01, unit: "m\\u00b2", d: 3 }],
    cuts: [
    { id: "pa", label: "Gauge: tap to compare", tap: (st, c) => { return "Same force, smaller area, bigger pressure."; } }],
    show: (st) => `P = F/A = 100 N / ${F(st.a, 3)} m\u00b2 = ${E(100 / st.a, 2)} Pa`,
  });
  ctx.art.touchable(["pa"]);
  return { destroy() {} };
}
