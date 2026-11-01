// Multiplier: Choose a multiplier so the 100 \u00b5A, 500 \u03a9 galvanometer reads 10 V full scale.
import { calc, f2 } from "../kit.js";
const F = f2, E = (x, d = 2) => x.toExponential(d).replace(/e\+?(-?)(\d+)/, (_, s, p) => " \u00d7 10^" + (s ? "\u2212" : "") + p).replace("-", "\u2212"), R = (a) => a[Math.floor(Math.random() * a.length)];
export default function build(ctx) {
  const k = calc(ctx, {
    st: {},
    sliders: [{ key: "r", label: "Multiplier", min: 10, max: 200, step: 0.5, value: 50, unit: "k\\u03a9", d: 1 }],
    cuts: [
    { id: "try", label: "Meter: tap to check", tap: (st, c) => { return Math.abs(st.r - 99.5) < 0.3 ? "Exactly 10 V full scale!" : "Not 10 V yet."; } }],
    show: (st) => `full scale = ${F(1e-4 * (500 + st.r * 1000), 2)} V`,
  });
  ctx.art.touchable(["try"]);
  return { destroy() {} };
}
