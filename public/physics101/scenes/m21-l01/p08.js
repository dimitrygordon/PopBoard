// Microphone: Change the tone sung into the microphone.
import { calc, f2 } from "../kit.js";
const F = f2, E = (x, d = 2) => x.toExponential(d).replace(/e\+?(-?)(\d+)/, (_, s, p) => " \u00d7 10^" + (s ? "\u2212" : "") + p).replace("-", "\u2212"), R = (a) => a[Math.floor(Math.random() * a.length)];
export default function build(ctx) {
  const k = calc(ctx, {
    st: {},
    sliders: [{ key: "f", label: "Frequency", min: 100, max: 1000, step: 10, value: 300, unit: "Hz", d: 0 }],
    cuts: [
    { id: "try", label: "Coil: tap to explain", tap: (st, c) => { return "The coil moves in the field and the signal traces the sound."; } }],
    show: (st) => `coil vibrates at ${st.f} Hz, signal at ${st.f} Hz`,
  });
  ctx.art.touchable(["try"]);
  return { destroy() {} };
}
