// Probability: Take more measurements.
import { calc, f2 } from "../kit.js";
const F = f2, E = (x, d = 2) => x.toExponential(d).replace(/e\+?(-?)(\d+)/, (_, s, p) => " \u00d7 10^" + (s ? "\u2212" : "") + p).replace("-", "\u2212"), R = (a) => a[Math.floor(Math.random() * a.length)];
export default function build(ctx) {
  const k = calc(ctx, {
    st: {},
    sliders: [{ key: "n", label: "Measurements", min: 0, max: 5000, step: 250, value: 500, unit: "", d: 0 }],
    cuts: [
    { id: "try", label: "Graph: tap to explain", tap: (st, c) => { return "Most likely near 0.053 nm."; } }],
    show: (st) => `${st.n} measurements; peak at the Bohr radius`,
  });
  ctx.art.touchable(["try"]);
  return { destroy() {} };
}
