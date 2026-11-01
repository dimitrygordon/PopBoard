// Probe: Drag the probe along the line between +2.0 \u00b5C (at 0) and \u22122.0 \u00b5C (at 1.0 m).
import { calc, f2 } from "../kit.js";
const F = f2, E = (x, d = 2) => x.toExponential(d).replace(/e\+?(-?)(\d+)/, (_, s, p) => " \u00d7 10^" + (s ? "\u2212" : "") + p).replace("-", "\u2212"), R = (a) => a[Math.floor(Math.random() * a.length)];
export default function build(ctx) {
  const k = calc(ctx, {
    st: {},
    sliders: [{ key: "x", label: "Probe position", min: 0.1, max: 0.9, step: 0.05, value: 0.5, unit: "m", d: 2 }],
    cuts: [
    { id: "try", label: "Probe: tap to explain", tap: (st, c) => { return "Both fields point toward the negative charge here, so they add."; } }],
    show: (st) => `E = ${E(9e9 * 2e-6 * (1 / st.x ** 2 + 1 / (1 - st.x) ** 2), 2)} N/C toward \u2212`,
  });
  ctx.art.touchable(["try"]);
  return { destroy() {} };
}
