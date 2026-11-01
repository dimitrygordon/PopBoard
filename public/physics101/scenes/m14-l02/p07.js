// Cap: Tap to cap or uncap a 0.50 m pipe.
import { calc, f2 } from "../kit.js";
const F = f2, E = (x, d = 2) => x.toExponential(d).replace(/e\+?(-?)(\d+)/, (_, s, p) => " \u00d7 10^" + (s ? "\u2212" : "") + p).replace("-", "\u2212"), R = (a) => a[Math.floor(Math.random() * a.length)];
export default function build(ctx) {
  const k = calc(ctx, {
    st: { i: 0 },
    sliders: [],
    cuts: [
    { id: "cap", label: "Octave jump: tap to toggle", tap: (st, c) => { st.i = 1 - st.i; return ""; } }],
    show: (st) => st.i ? `capped (closed): fundamental ${F(343 / 2, 0)} Hz` : `open: fundamental ${F(343, 0)} Hz, an octave higher`,
  });
  ctx.art.touchable(["cap"]);
  return { destroy() {} };
}
