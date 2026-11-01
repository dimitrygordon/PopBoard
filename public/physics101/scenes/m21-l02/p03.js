// Opposing force: Pull the wire faster (B = 0.50 T, L = 0.20 m, R = 0.10 \u03a9).
import { calc, f2 } from "../kit.js";
const F = f2, E = (x, d = 2) => x.toExponential(d).replace(/e\+?(-?)(\d+)/, (_, s, p) => " \u00d7 10^" + (s ? "\u2212" : "") + p).replace("-", "\u2212"), R = (a) => a[Math.floor(Math.random() * a.length)];
export default function build(ctx) {
  const k = calc(ctx, {
    st: {},
    sliders: [{ key: "v", label: "v", min: 0, max: 5, step: 0.5, value: 2, unit: "m/s", d: 1 }],
    cuts: [
    { id: "try", label: "Wire: tap to explain", tap: (st, c) => { return "The force opposes the motion."; } }],
    show: (st) => (() => { const i = 0.5 * 0.2 * st.v / 0.1; return `I = ${F(i, 1)} A\nopposing force = ILB = ${F(i * 0.2 * 0.5, 2)} N`; })(),
  });
  ctx.art.touchable(["try"]);
  return { destroy() {} };
}
