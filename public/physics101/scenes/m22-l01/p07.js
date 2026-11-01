// Drop: Tap to drop the atom one step.
import { calc, f2 } from "../kit.js";
const F = f2, E = (x, d = 2) => x.toExponential(d).replace(/e\+?(-?)(\d+)/, (_, s, p) => " \u00d7 10^" + (s ? "\u2212" : "") + p).replace("-", "\u2212"), R = (a) => a[Math.floor(Math.random() * a.length)];
export default function build(ctx) {
  const k = calc(ctx, {
    st: { n: 3 },
    sliders: [],
    cuts: [
    { id: "try", label: "Atom: tap to drop", tap: (st, c) => { st.n = st.n > 0 ? st.n - 1 : 3; return ""; } }],
    show: (st) => `level ${st.n}hf; each drop emits one bundle hf`,
  });
  ctx.art.touchable(["try"]);
  return { destroy() {} };
}
