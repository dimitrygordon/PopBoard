// Squeezed pipe: Squeeze the middle of a water pipe (wide part: 1.0 m/s at 200 kPa).
import { calc, f2 } from "../kit.js";
const F = f2, E = (x, d = 2) => x.toExponential(d).replace(/e\+?(-?)(\d+)/, (_, s, p) => " \u00d7 10^" + (s ? "\u2212" : "") + p).replace("-", "\u2212"), R = (a) => a[Math.floor(Math.random() * a.length)];
export default function build(ctx) {
  const k = calc(ctx, {
    st: {},
    sliders: [{ key: "s", label: "Narrow width ratio", min: 0.2, max: 1, step: 0.05, value: 0.5, unit: "", d: 2 }],
    cuts: [
    { id: "pipe", label: "Gauges: tap to explain", tap: (st, c) => { return "Faster water, lower pressure."; } }],
    show: (st) => (() => { const v = 1 / st.s; return `narrow: v = ${F(v, 1)} m/s\nP = ${F(200 - 0.5 * (v * v - 1), 1)} kPa`; })(),
  });
  ctx.art.touchable(["pipe"]);
  return { destroy() {} };
}
