// Relative motion: Tap to try the next way.
import { calc, f2 } from "../kit.js";
const F = f2, E = (x, d = 2) => x.toExponential(d).replace(/e\+?(-?)(\d+)/, (_, s, p) => " \u00d7 10^" + (s ? "\u2212" : "") + p).replace("-", "\u2212"), R = (a) => a[Math.floor(Math.random() * a.length)];
export default function build(ctx) {
  const k = calc(ctx, {
    st: { i: 0, N: ["move the wire", "move the magnet", "change the magnet's strength"] },
    sliders: [],
    cuts: [
    { id: "try", label: "Setup: tap for the next way", tap: (st, c) => { st.i = (st.i + 1) % 3; return "Any change in the field through the circuit induces current."; } }],
    show: (st) => `${st.N[st.i]}: current induced`,
  });
  ctx.art.touchable(["try"]);
  return { destroy() {} };
}
