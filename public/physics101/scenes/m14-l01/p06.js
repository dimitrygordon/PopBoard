// Pitch: Slide the frequency.
import { calc, f2 } from "../kit.js";
const F = f2, E = (x, d = 2) => x.toExponential(d).replace(/e\+?(-?)(\d+)/, (_, s, p) => " \u00d7 10^" + (s ? "\u2212" : "") + p).replace("-", "\u2212"), R = (a) => a[Math.floor(Math.random() * a.length)];
export default function build(ctx) {
  const k = calc(ctx, {
    st: {},
    sliders: [{ key: "f", label: "Frequency", min: 20, max: 2000, step: 10, value: 440, unit: "Hz", d: 0 }],
    cuts: [
    { id: "dial", label: "Pitch: tap to describe", tap: (st, c) => { return st.f < 250 ? "Low pitch." : st.f < 800 ? "Middle pitch." : "High pitch."; } }],
    show: (st) => `f = ${st.f} Hz, \u03bb = ${F(343 / st.f, 2)} m in 20 \u00b0C air`,
  });
  ctx.art.touchable(["dial"]);
  return { destroy() {} };
}
