// Electron mass: Measure the radius (v = 2.0 \u00d7 10\u2077 m/s, B = 3.5 mT).
import { calc, f2 } from "../kit.js";
const F = f2, E = (x, d = 2) => x.toExponential(d).replace(/e\+?(-?)(\d+)/, (_, s, p) => " \u00d7 10^" + (s ? "\u2212" : "") + p).replace("-", "\u2212"), R = (a) => a[Math.floor(Math.random() * a.length)];
export default function build(ctx) {
  const k = calc(ctx, {
    st: {},
    sliders: [{ key: "r", label: "r", min: 2, max: 5, step: 0.05, value: 3.25, unit: "cm", d: 2 }],
    cuts: [
    { id: "try", label: "Beam: tap to explain", tap: (st, c) => { return "m = q/(q/m)."; } }],
    show: (st) => (() => { const qm = 2e7 / (3.5e-3 * st.r / 100); return `q/m = ${E(qm, 2)} C/kg\nm = ${E(1.602e-19 / qm, 2)} kg`; })(),
  });
  ctx.art.touchable(["try"]);
  return { destroy() {} };
}
