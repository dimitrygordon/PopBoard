// Bob: Pull a 0.50 kg mass on a 20 N/m spring, release it, and time one full cycle.
import { calc, f2 } from "../kit.js";
const F = f2, E = (x, d = 2) => x.toExponential(d).replace(/e\+?(-?)(\d+)/, (_, s, p) => " \u00d7 10^" + (s ? "\u2212" : "") + p).replace("-", "\u2212"), R = (a) => a[Math.floor(Math.random() * a.length)];
export default function build(ctx) {
  const k = calc(ctx, {
    st: {},
    sliders: [{ key: "a", label: "Pull distance", min: 1, max: 20, step: 1, value: 10, unit: "cm", d: 0 }],
    cuts: [
    { id: "bob", label: "Time one cycle: tap to time it", tap: (st, c) => { return `One cycle takes ${F(2 * Math.PI * Math.sqrt(0.5 / 20), 2)} s, whatever the amplitude.`; } }],
    show: (st) => `amplitude = ${st.a} cm\nperiod = ${F(2 * Math.PI * Math.sqrt(0.5 / 20), 2)} s`,
  });
  ctx.art.touchable(["bob"]);
  return { destroy() {} };
}
