// Heater: Run a 120 V, 240 \u03a9 immersion heater in 0.20 kg of water at 20 \u00b0C.
import { calc, f2 } from "../kit.js";
const F = f2, E = (x, d = 2) => x.toExponential(d).replace(/e\+?(-?)(\d+)/, (_, s, p) => " \u00d7 10^" + (s ? "\u2212" : "") + p).replace("-", "\u2212"), R = (a) => a[Math.floor(Math.random() * a.length)];
export default function build(ctx) {
  const k = calc(ctx, {
    st: {},
    sliders: [{ key: "t", label: "Time", min: 0, max: 300, step: 10, value: 60, unit: "s", d: 0 }],
    cuts: [
    { id: "try", label: "Cup: tap to explain", tap: (st, c) => { return "E = Pt, and the water warms by E/mC."; } }],
    show: (st) => `E = ${F(60 * st.t, 0)} J\nwater: ${F(20 + 60 * st.t / (0.2 * 4180), 1)} \u00b0C`,
  });
  ctx.art.touchable(["try"]);
  return { destroy() {} };
}
