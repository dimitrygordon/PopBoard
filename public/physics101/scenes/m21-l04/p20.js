// Tuning: Turn the dial (L = 1.0 \u00b5H).
import { calc, f2 } from "../kit.js";
const F = f2, E = (x, d = 2) => x.toExponential(d).replace(/e\+?(-?)(\d+)/, (_, s, p) => " \u00d7 10^" + (s ? "\u2212" : "") + p).replace("-", "\u2212"), R = (a) => a[Math.floor(Math.random() * a.length)];
export default function build(ctx) {
  const k = calc(ctx, {
    st: {},
    sliders: [{ key: "c", label: "C", min: 2, max: 4, step: 0.01, value: 2.53, unit: "pF", d: 2 }],
    cuts: [
    { id: "try", label: "Dial: tap to add lightning noise", tap: (st, c) => { return "AM picks up the crackle; FM rejects it."; } }],
    show: (st) => `tuned to ${F(1 / (2 * Math.PI * Math.sqrt(1e-6 * st.c * 1e-12)) / 1e6, 1)} MHz`,
  });
  ctx.art.touchable(["try"]);
  return { destroy() {} };
}
