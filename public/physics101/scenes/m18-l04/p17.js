// Farads: Tap to compare capacitors charged to 10 V.
import { calc, f2 } from "../kit.js";
const F = f2, E = (x, d = 2) => x.toExponential(d).replace(/e\+?(-?)(\d+)/, (_, s, p) => " \u00d7 10^" + (s ? "\u2212" : "") + p).replace("-", "\u2212"), R = (a) => a[Math.floor(Math.random() * a.length)];
export default function build(ctx) {
  const k = calc(ctx, {
    st: { i: 0, N: ["1 pF", "1 \u00b5F", "1 F"], Q: ["10 pC", "10 \u00b5C", "10 C"] },
    sliders: [],
    cuts: [
    { id: "try", label: "Capacitors: tap for the next one", tap: (st, c) => { st.i = (st.i + 1) % 3; return ""; } }],
    show: (st) => `${st.N[st.i]}: holds ${st.Q[st.i]}`,
  });
  ctx.art.touchable(["try"]);
  return { destroy() {} };
}
