// Charge up: Connect a 12 V battery and slide time.
import { calc, f2 } from "../kit.js";
const F = f2, E = (x, d = 2) => x.toExponential(d).replace(/e\+?(-?)(\d+)/, (_, s, p) => " \u00d7 10^" + (s ? "\u2212" : "") + p).replace("-", "\u2212"), R = (a) => a[Math.floor(Math.random() * a.length)];
export default function build(ctx) {
  const k = calc(ctx, {
    st: {},
    sliders: [{ key: "t", label: "Time", min: 0, max: 5, step: 0.5, value: 0, unit: "s", d: 1 }],
    cuts: [
    { id: "try", label: "Plates: tap to explain", tap: (st, c) => { return "Opposite charges build up on each plate."; } }],
    show: (st) => `plate charge = ${F(12 * (1 - Math.exp(-st.t)), 1)} \u00b5C (C = 1.0 \u00b5F)`,
  });
  ctx.art.touchable(["try"]);
  return { destroy() {} };
}
