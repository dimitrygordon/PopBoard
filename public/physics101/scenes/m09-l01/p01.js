// Bat-ball force pulse peaking about 1.5e4 N over about 3 ms (Figure 1 as redrawn).
import { calc, f2 } from "../kit.js";
const F = f2, E = (x, d = 2) => x.toExponential(d).replace(/e\+?(-?)(\d+)/, (_, s, p) => " \u00d7 10^" + (s ? "\u2212" : "") + p).replace("-", "\u2212"), R = (a) => a[Math.floor(Math.random() * a.length)];
export default function build(ctx) {
  const k = calc(ctx, {
    st: { i: 0, T: [0, 0.5, 1, 1.5, 2, 2.5, 3] },
    sliders: [],
    cuts: [
    { id: "swing", label: "Swing: tap to step 0.5 ms", tap: (st, c) => { st.i = (st.i + 1) % 7; return ""; } }],
    show: (st) => (() => { const t = st.T[st.i]; return `t = ${F(t, 1)} ms: F = ${E(1.5e4 * Math.sin(Math.PI * t / 3) ** 2)} N`; })(),
  });
  ctx.art.touchable(["swing"]);
  return { destroy() {} };
}
