// Muffin atom: Tap to fire a positive particle.
import { calc, f2 } from "../kit.js";
const F = f2, E = (x, d = 2) => x.toExponential(d).replace(/e\+?(-?)(\d+)/, (_, s, p) => " \u00d7 10^" + (s ? "\u2212" : "") + p).replace("-", "\u2212"), R = (a) => a[Math.floor(Math.random() * a.length)];
export default function build(ctx) {
  const k = calc(ctx, {
    st: { s: 0 },
    sliders: [],
    cuts: [
    { id: "try", label: "Atom: tap to fire", tap: (st, c) => { st.s = 1; return ""; } }],
    show: (st) => st.s ? "prediction: passes straight through with tiny deflection" : "spread-out charge, ready",
  });
  ctx.art.touchable(["try"]);
  return { destroy() {} };
}
