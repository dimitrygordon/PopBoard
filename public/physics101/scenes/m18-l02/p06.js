// Two spheres: Tap for the next induction step with two touching spheres.
import { calc, f2 } from "../kit.js";
const F = f2, E = (x, d = 2) => x.toExponential(d).replace(/e\+?(-?)(\d+)/, (_, s, p) => " \u00d7 10^" + (s ? "\u2212" : "") + p).replace("-", "\u2212"), R = (a) => a[Math.floor(Math.random() * a.length)];
export default function build(ctx) {
  const k = calc(ctx, {
    st: { s: 0, N: ["bring a negative rod near sphere A", "electrons move to sphere B", "pull the spheres apart", "remove the rod: A is +, B is \u2212, equal amounts"] },
    sliders: [],
    cuts: [
    { id: "try", label: "Spheres: tap for the next step", tap: (st, c) => { st.s = (st.s + 1) % 4; return ""; } }],
    show: (st) => st.N[st.s],
  });
  ctx.art.touchable(["try"]);
  return { destroy() {} };
}
