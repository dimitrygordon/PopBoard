// Standing waves: Tune the shaking frequency for a 2.0 m rope with wave speed 8.0 m/s.
import { calc, f2 } from "../kit.js";
const F = f2, E = (x, d = 2) => x.toExponential(d).replace(/e\+?(-?)(\d+)/, (_, s, p) => " \u00d7 10^" + (s ? "\u2212" : "") + p).replace("-", "\u2212"), R = (a) => a[Math.floor(Math.random() * a.length)];
export default function build(ctx) {
  const k = calc(ctx, {
    st: {},
    sliders: [{ key: "f", label: "Frequency", min: 1, max: 10, step: 0.5, value: 2, unit: "Hz", d: 1 }],
    cuts: [
    { id: "tune", label: "Standing waves: tap to explain", tap: (st, c) => { return "Standing waves when L is a whole number of half wavelengths."; } }],
    show: (st) => (() => { const n = st.f / 2; return Number.isInteger(n) ? `standing wave: ${n} loop${n > 1 ? "s" : ""}, \u03bb = ${F(8 / st.f, 2)} m` : "no standing wave"; })(),
  });
  ctx.art.touchable(["tune"]);
  return { destroy() {} };
}
