// Compare: Tap to switch between the rope and the spring.
import { calc, f2 } from "../kit.js";
const F = f2, E = (x, d = 2) => x.toExponential(d).replace(/e\+?(-?)(\d+)/, (_, s, p) => " \u00d7 10^" + (s ? "\u2212" : "") + p).replace("-", "\u2212"), R = (a) => a[Math.floor(Math.random() * a.length)];
export default function build(ctx) {
  const k = calc(ctx, {
    st: { i: 0 },
    sliders: [],
    cuts: [
    { id: "cmp", label: "Particle motion: tap to switch", tap: (st, c) => { st.i = 1 - st.i; return ""; } }],
    show: (st) => st.i ? "spring pushed back and forth: longitudinal (parallel)" : "rope shaken side to side: transverse (perpendicular)",
  });
  ctx.art.touchable(["cmp"]);
  return { destroy() {} };
}
