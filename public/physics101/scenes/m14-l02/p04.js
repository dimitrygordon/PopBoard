// Air column: Slide the tube up out of the water under a 392 Hz fork (v = 343 m/s).
import { calc, f2 } from "../kit.js";
const F = f2, E = (x, d = 2) => x.toExponential(d).replace(/e\+?(-?)(\d+)/, (_, s, p) => " \u00d7 10^" + (s ? "\u2212" : "") + p).replace("-", "\u2212"), R = (a) => a[Math.floor(Math.random() * a.length)];
export default function build(ctx) {
  const k = calc(ctx, {
    st: {},
    sliders: [{ key: "l", label: "Air column", min: 5, max: 80, step: 0.5, value: 20, unit: "cm", d: 1 }],
    cuts: [
    { id: "tube", label: "Loudness: tap to explain", tap: (st, c) => { return "Loudest at a quarter wavelength, then every half wavelength more."; } }],
    show: (st) => (() => { const q = 34300 / 392 / 4, k = (st.l - q) / (2 * q); const r = Math.abs(k - Math.round(k)) < 0.05 && k > -0.1; return `${r ? "LOUD: resonance" : "quiet"}\nresonances at ${F(q, 1)}, ${F(3 * q, 1)}, ${F(5 * q, 1)} cm`; })(),
  });
  ctx.art.touchable(["tube"]);
  return { destroy() {} };
}
