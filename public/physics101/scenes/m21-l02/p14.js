// Ideal: Step up 120 V carrying 10 A in the primary.
import { calc, f2 } from "../kit.js";
const F = f2, E = (x, d = 2) => x.toExponential(d).replace(/e\+?(-?)(\d+)/, (_, s, p) => " \u00d7 10^" + (s ? "\u2212" : "") + p).replace("-", "\u2212"), R = (a) => a[Math.floor(Math.random() * a.length)];
export default function build(ctx) {
  const k = calc(ctx, {
    st: {},
    sliders: [{ key: "r", label: "N_s/N_p", min: 1, max: 20, step: 1, value: 5, unit: "", d: 0 }],
    cuts: [
    { id: "try", label: "Coils: tap to explain", tap: (st, c) => { return "Power in = power out."; } }],
    show: (st) => `V_s = ${120 * st.r} V, I_s = ${F(10 / st.r, 2)} A\nP = 1200 W both sides`,
  });
  ctx.art.touchable(["try"]);
  return { destroy() {} };
}
