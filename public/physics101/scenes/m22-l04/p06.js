// Coherent: Line up the waves.
import { calc, f2 } from "../kit.js";
const F = f2, E = (x, d = 2) => x.toExponential(d).replace(/e\+?(-?)(\d+)/, (_, s, p) => " \u00d7 10^" + (s ? "\u2212" : "") + p).replace("-", "\u2212"), R = (a) => a[Math.floor(Math.random() * a.length)];
export default function build(ctx) {
  const k = calc(ctx, {
    st: {},
    sliders: [{ key: "p", label: "Phase spread", min: 0, max: 180, step: 10, value: 120, unit: "\\u00b0", d: 0 }],
    cuts: [
    { id: "try", label: "Waves: tap to explain", tap: (st, c) => { return "Coherent: crests in step."; } }],
    show: (st) => st.p === 0 ? "coherent" : "incoherent",
  });
  ctx.art.touchable(["try"]);
  return { destroy() {} };
}
