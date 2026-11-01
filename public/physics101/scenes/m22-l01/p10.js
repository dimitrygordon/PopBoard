// Threshold: Set the frequency and intensity (f\u2080 = 5.7 \u00d7 10\u00b9\u2074 Hz).
import { calc, f2 } from "../kit.js";
const F = f2, E = (x, d = 2) => x.toExponential(d).replace(/e\+?(-?)(\d+)/, (_, s, p) => " \u00d7 10^" + (s ? "\u2212" : "") + p).replace("-", "\u2212"), R = (a) => a[Math.floor(Math.random() * a.length)];
export default function build(ctx) {
  const k = calc(ctx, {
    st: {},
    sliders: [{ key: "f", label: "f", min: 3, max: 12, step: 0.1, value: 6, unit: "\\u00d7 10\\u00b9\\u2074 Hz", d: 1 }, { key: "b", label: "Intensity", min: 0, max: 100, step: 10, value: 50, unit: "%", d: 0 }],
    cuts: [
    { id: "try", label: "Map: tap to explain", tap: (st, c) => { return "Below f\u2080: no current at any brightness."; } }],
    show: (st) => st.f >= 5.7 && st.b > 0 ? `current \u221d intensity: ${st.b}%` : "no current",
  });
  ctx.art.touchable(["try"]);
  return { destroy() {} };
}
