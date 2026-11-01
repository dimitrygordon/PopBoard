// Planck: Pick the second point on the line (first at 6.0 \u00d7 10\u00b9\u2074 Hz, 0.20 eV).
import { calc, f2 } from "../kit.js";
const F = f2, E = (x, d = 2) => x.toExponential(d).replace(/e\+?(-?)(\d+)/, (_, s, p) => " \u00d7 10^" + (s ? "\u2212" : "") + p).replace("-", "\u2212"), R = (a) => a[Math.floor(Math.random() * a.length)];
export default function build(ctx) {
  const k = calc(ctx, {
    st: {},
    sliders: [{ key: "f", label: "f", min: 7, max: 12, step: 0.5, value: 10, unit: "\\u00d7 10\\u00b9\\u2074 Hz", d: 1 }],
    cuts: [
    { id: "try", label: "Graph: tap to explain", tap: (st, c) => { return "The slope of KE vs. f is h for every metal."; } }],
    show: (st) => (() => { const k = 0.2 + 4.136e-15 * (st.f - 6) * 1e14; return `KE = ${F(k, 2)} eV, slope = ${E(4.136e-15, 2)} eV/Hz\nh = ${E(6.626e-34, 2)} J\u00b7s`; })(),
  });
  ctx.art.touchable(["try"]);
  return { destroy() {} };
}
