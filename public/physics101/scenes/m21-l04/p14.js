// Pushes: Set your pushing rhythm (pendulum period 2.0 s).
import { calc, f2 } from "../kit.js";
const F = f2, E = (x, d = 2) => x.toExponential(d).replace(/e\+?(-?)(\d+)/, (_, s, p) => " \u00d7 10^" + (s ? "\u2212" : "") + p).replace("-", "\u2212"), R = (a) => a[Math.floor(Math.random() * a.length)];
export default function build(ctx) {
  const k = calc(ctx, {
    st: {},
    sliders: [{ key: "t", label: "Push interval", min: 1, max: 3, step: 0.1, value: 1.5, unit: "s", d: 1 }],
    cuts: [
    { id: "try", label: "Swing: tap to explain", tap: (st, c) => { return "In time with the natural period: biggest swing. Feedback does the same for a circuit."; } }],
    show: (st) => Math.abs(st.t - 2) < 0.05 ? "biggest swing: resonance" : "small swing",
  });
  ctx.art.touchable(["try"]);
  return { destroy() {} };
}
