// Turns: Change the turns (120 V in).
import { calc, f2 } from "../kit.js";
const F = f2, E = (x, d = 2) => x.toExponential(d).replace(/e\+?(-?)(\d+)/, (_, s, p) => " \u00d7 10^" + (s ? "\u2212" : "") + p).replace("-", "\u2212"), R = (a) => a[Math.floor(Math.random() * a.length)];
export default function build(ctx) {
  const k = calc(ctx, {
    st: {},
    sliders: [{ key: "p", label: "N_p", min: 50, max: 1000, step: 50, value: 500, unit: "", d: 0 }, { key: "s", label: "N_s", min: 50, max: 1000, step: 50, value: 100, unit: "", d: 0 }],
    cuts: [
    { id: "try", label: "Transformer: tap to explain", tap: (st, c) => { return "V_s/V_p = N_s/N_p."; } }],
    show: (st) => `V_s = ${F(120 * st.s / st.p, 1)} V (${st.s > st.p ? "step-up" : st.s < st.p ? "step-down" : "same"})`,
  });
  ctx.art.touchable(["try"]);
  return { destroy() {} };
}
