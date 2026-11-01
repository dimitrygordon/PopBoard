// Series: Step through the chain.
import { calc, f2 } from "../kit.js";
const F = f2, E = (x, d = 2) => x.toExponential(d).replace(/e\+?(-?)(\d+)/, (_, s, p) => " \u00d7 10^" + (s ? "\u2212" : "") + p).replace("-", "\u2212"), R = (a) => a[Math.floor(Math.random() * a.length)];
export default function build(ctx) {
  const k = calc(ctx, {
    st: {},
    sliders: [{ key: "k", label: "Steps", min: 0, max: 14, step: 1, value: 0, unit: "", d: 0 }],
    cuts: [
    { id: "try", label: "Chain: tap to explain", tap: (st, c) => { return "8 alphas and 6 betas reach lead-206."; } }],
    show: (st) => st.k === 14 ? "lead-206: stable" : `step ${st.k} of 14`,
  });
  ctx.art.touchable(["try"]);
  return { destroy() {} };
}
