// Inside: Tap to follow the ion to the next stage.
import { calc, f2 } from "../kit.js";
const F = f2, E = (x, d = 2) => x.toExponential(d).replace(/e\+?(-?)(\d+)/, (_, s, p) => " \u00d7 10^" + (s ? "\u2212" : "") + p).replace("-", "\u2212"), R = (a) => a[Math.floor(Math.random() * a.length)];
export default function build(ctx) {
  const k = calc(ctx, {
    st: { i: 0, N: ["ion source: atoms lose electrons", "accelerating electrodes: ions speed up", "magnetic field: path curves", "detector: the spot's position gives the mass"] },
    sliders: [],
    cuts: [
    { id: "try", label: "Path: tap for the next stage", tap: (st, c) => { st.i = (st.i + 1) % 4; return ""; } }],
    show: (st) => st.N[st.i],
  });
  ctx.art.touchable(["try"]);
  return { destroy() {} };
}
