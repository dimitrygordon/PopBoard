// Harmonics: Slide the second harmonic's amplitude on a 220 Hz fundamental.
import { calc, f2 } from "../kit.js";
const F = f2, E = (x, d = 2) => x.toExponential(d).replace(/e\+?(-?)(\d+)/, (_, s, p) => " \u00d7 10^" + (s ? "\u2212" : "") + p).replace("-", "\u2212"), R = (a) => a[Math.floor(Math.random() * a.length)];
export default function build(ctx) {
  const k = calc(ctx, {
    st: {},
    sliders: [{ key: "a", label: "440 Hz amplitude", min: 0, max: 1, step: 0.1, value: 0.5, unit: "", d: 1 }],
    cuts: [
    { id: "sl", label: "Spectrum: tap to explain", tap: (st, c) => { return "Harmonics are whole-number multiples of the fundamental."; } }],
    show: (st) => `220 Hz: 1.0, 440 Hz: ${F(st.a, 1)}, 660 Hz: 0.3`,
  });
  ctx.art.touchable(["sl"]);
  return { destroy() {} };
}
