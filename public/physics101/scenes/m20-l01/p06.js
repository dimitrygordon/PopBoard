// Materials: Tap to touch the next object to the magnet.
import { calc, f2 } from "../kit.js";
const F = f2, E = (x, d = 2) => x.toExponential(d).replace(/e\+?(-?)(\d+)/, (_, s, p) => " \u00d7 10^" + (s ? "\u2212" : "") + p).replace("-", "\u2212"), R = (a) => a[Math.floor(Math.random() * a.length)];
export default function build(ctx) {
  const k = calc(ctx, {
    st: { i: 0, N: ["iron", "nickel", "copper", "aluminum"] },
    sliders: [],
    cuts: [
    { id: "try", label: "Object: tap for the next one", tap: (st, c) => { st.i = (st.i + 1) % 4; return ""; } }],
    show: (st) => `${st.N[st.i]}: ${st.i < 2 ? "becomes a temporary magnet" : "not attracted"}`,
  });
  ctx.art.touchable(["try"]);
  return { destroy() {} };
}
