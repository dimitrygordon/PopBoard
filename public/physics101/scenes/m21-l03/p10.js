// Neon: Tap to send the neon beam through.
import { calc, f2 } from "../kit.js";
const F = f2, E = (x, d = 2) => x.toExponential(d).replace(/e\+?(-?)(\d+)/, (_, s, p) => " \u00d7 10^" + (s ? "\u2212" : "") + p).replace("-", "\u2212"), R = (a) => a[Math.floor(Math.random() * a.length)];
export default function build(ctx) {
  const k = calc(ctx, {
    st: { s: 0 },
    sliders: [],
    cuts: [
    { id: "try", label: "Beam: tap to fire", tap: (st, c) => { st.s = 1; return "Three isotopes, three spots."; } }],
    show: (st) => st.s ? "spots for neon-20, neon-21, neon-22" : "beam not fired yet",
  });
  ctx.art.touchable(["try"]);
  return { destroy() {} };
}
