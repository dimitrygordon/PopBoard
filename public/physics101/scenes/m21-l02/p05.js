// Crank: Switch on bulbs.
import { calc, f2 } from "../kit.js";
const F = f2, E = (x, d = 2) => x.toExponential(d).replace(/e\+?(-?)(\d+)/, (_, s, p) => " \u00d7 10^" + (s ? "\u2212" : "") + p).replace("-", "\u2212"), R = (a) => a[Math.floor(Math.random() * a.length)];
export default function build(ctx) {
  const k = calc(ctx, {
    st: {},
    sliders: [{ key: "n", label: "Bulbs", min: 0, max: 5, step: 1, value: 0, unit: "", d: 0 }],
    cuts: [
    { id: "try", label: "Generator: tap to explain", tap: (st, c) => { return "More current, more opposing force."; } }],
    show: (st) => `turning effort: ${st.n === 0 ? "easy" : st.n + " \u00d7 harder"}`,
  });
  ctx.art.touchable(["try"]);
  return { destroy() {} };
}
