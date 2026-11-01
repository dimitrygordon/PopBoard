// Alpha: Tap to pop out an alpha.
import { calc, f2 } from "../kit.js";
const F = f2, E = (x, d = 2) => x.toExponential(d).replace(/e\+?(-?)(\d+)/, (_, s, p) => " \u00d7 10^" + (s ? "\u2212" : "") + p).replace("-", "\u2212"), R = (a) => a[Math.floor(Math.random() * a.length)];
export default function build(ctx) {
  const k = calc(ctx, {
    st: { s: 0 },
    sliders: [],
    cuts: [
    { id: "try", label: "Nucleus: tap to decay", tap: (st, c) => { st.s = 1 - st.s; return ""; } }],
    show: (st) => st.s ? "thorium-234: A = 234, Z = 90" : "uranium-238: A = 238, Z = 92",
  });
  ctx.art.touchable(["try"]);
  return { destroy() {} };
}
