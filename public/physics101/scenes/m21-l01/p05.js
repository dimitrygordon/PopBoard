// Calculate EMF: Change B, L, v, and the angle (R = 1.0 \u03a9).
import { calc, f2 } from "../kit.js";
const F = f2, E = (x, d = 2) => x.toExponential(d).replace(/e\+?(-?)(\d+)/, (_, s, p) => " \u00d7 10^" + (s ? "\u2212" : "") + p).replace("-", "\u2212"), R = (a) => a[Math.floor(Math.random() * a.length)];
export default function build(ctx) {
  const k = calc(ctx, {
    st: {},
    sliders: [{ key: "b", label: "B", min: 0.1, max: 1, step: 0.1, value: 0.5, unit: "T", d: 1 }, { key: "l", label: "L", min: 0.1, max: 1, step: 0.1, value: 0.5, unit: "m", d: 1 }, { key: "v", label: "v", min: 1, max: 10, step: 1, value: 5, unit: "m/s", d: 0 }, { key: "a", label: "Angle", min: 0, max: 90, step: 5, value: 90, unit: "\\u00b0", d: 0 }],
    cuts: [
    { id: "try", label: "Meter: tap to explain", tap: (st, c) => { return "EMF = BLv sin\u03b8."; } }],
    show: (st) => (() => { const e = st.b * st.l * st.v * Math.sin(st.a * Math.PI / 180); return `EMF = ${F(e, 2)} V, I = ${F(e, 2)} A`; })(),
  });
  ctx.art.touchable(["try"]);
  return { destroy() {} };
}
