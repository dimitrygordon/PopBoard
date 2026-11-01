// Electron gas: Tap to switch the field.
import { calc, f2 } from "../kit.js";
const F = f2, E = (x, d = 2) => x.toExponential(d).replace(/e\+?(-?)(\d+)/, (_, s, p) => " \u00d7 10^" + (s ? "\u2212" : "") + p).replace("-", "\u2212"), R = (a) => a[Math.floor(Math.random() * a.length)];
export default function build(ctx) {
  const k = calc(ctx, {
    st: { e: 0 },
    sliders: [],
    cuts: [
    { id: "try", label: "Wire: tap to switch", tap: (st, c) => { st.e = 1 - st.e; return ""; } }],
    show: (st) => st.e ? "field on: random zigzag plus a slow drift" : "field off: random zigzag, no net motion",
  });
  ctx.art.touchable(["try"]);
  return { destroy() {} };
}
