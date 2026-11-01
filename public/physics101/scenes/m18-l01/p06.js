// Test objects: Tap to bring the next object near strips B and T.
import { calc, f2 } from "../kit.js";
const F = f2, E = (x, d = 2) => x.toExponential(d).replace(/e\+?(-?)(\d+)/, (_, s, p) => " \u00d7 10^" + (s ? "\u2212" : "") + p).replace("-", "\u2212"), R = (a) => a[Math.floor(Math.random() * a.length)];
export default function build(ctx) {
  const k = calc(ctx, {
    st: { i: 0, N: ["charged comb (\u2212)", "glass rod rubbed with silk (+)", "wool rubbed on the comb (+)"], B: ["repels B, attracts T", "attracts B, repels T", "attracts B, repels T"] },
    sliders: [],
    cuts: [
    { id: "try", label: "Object: tap for the next one", tap: (st, c) => { st.i = (st.i + 1) % 3; return ""; } }],
    show: (st) => `${st.N[st.i]}: ${st.B[st.i]}`,
  });
  ctx.art.touchable(["try"]);
  return { destroy() {} };
}
