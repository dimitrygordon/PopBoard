// Amplitude: Change the amplitude and watch the energy meter.
import { calc, f2 } from "../kit.js";
const F = f2, E = (x, d = 2) => x.toExponential(d).replace(/e\+?(-?)(\d+)/, (_, s, p) => " \u00d7 10^" + (s ? "\u2212" : "") + p).replace("-", "\u2212"), R = (a) => a[Math.floor(Math.random() * a.length)];
export default function build(ctx) {
  const k = calc(ctx, {
    st: {},
    sliders: [{ key: "a", label: "Amplitude", min: 0, max: 4, step: 0.5, value: 1, unit: "cm", d: 1 }],
    cuts: [
    { id: "amp", label: "Energy meter: tap to explain", tap: (st, c) => { return "Energy goes as amplitude squared."; } }],
    show: (st) => `energy = ${F(st.a * st.a, 2)} \u00d7 (energy at 1 cm)`,
  });
  ctx.art.touchable(["amp"]);
  return { destroy() {} };
}
