// Equivalent R: Add 30 \u03a9 branches in parallel.
import { calc, f2 } from "../kit.js";
const F = f2, E = (x, d = 2) => x.toExponential(d).replace(/e\+?(-?)(\d+)/, (_, s, p) => " \u00d7 10^" + (s ? "\u2212" : "") + p).replace("-", "\u2212"), R = (a) => a[Math.floor(Math.random() * a.length)];
export default function build(ctx) {
  const k = calc(ctx, {
    st: {},
    sliders: [{ key: "n", label: "Branches", min: 1, max: 6, step: 1, value: 1, unit: "", d: 0 }],
    cuts: [
    { id: "try", label: "R: tap to explain", tap: (st, c) => { return "Each new path lowers R below the smallest resistor."; } }],
    show: (st) => `1/R = ${st.n}/30, R = ${F(30 / st.n, 1)} \u03a9`,
  });
  ctx.art.touchable(["try"]);
  return { destroy() {} };
}
