// RMS: Change the effective voltage.
import { calc, f2 } from "../kit.js";
const F = f2, E = (x, d = 2) => x.toExponential(d).replace(/e\+?(-?)(\d+)/, (_, s, p) => " \u00d7 10^" + (s ? "\u2212" : "") + p).replace("-", "\u2212"), R = (a) => a[Math.floor(Math.random() * a.length)];
export default function build(ctx) {
  const k = calc(ctx, {
    st: {},
    sliders: [{ key: "v", label: "V_eff", min: 50, max: 240, step: 5, value: 120, unit: "V", d: 0 }],
    cuts: [
    { id: "try", label: "Wave: tap to explain", tap: (st, c) => { return "Peak = \u221a2 \u00d7 effective."; } }],
    show: (st) => `peak = ${F(st.v * Math.SQRT2, 0)} V`,
  });
  ctx.art.touchable(["try"]);
  return { destroy() {} };
}
