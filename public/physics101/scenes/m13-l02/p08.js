// Two graphs: Tap to switch between a snapshot and a displacement-time graph.
import { calc, f2 } from "../kit.js";
const F = f2, E = (x, d = 2) => x.toExponential(d).replace(/e\+?(-?)(\d+)/, (_, s, p) => " \u00d7 10^" + (s ? "\u2212" : "") + p).replace("-", "\u2212"), R = (a) => a[Math.floor(Math.random() * a.length)];
export default function build(ctx) {
  const k = calc(ctx, {
    st: { i: 0 },
    sliders: [],
    cuts: [
    { id: "gr", label: "\\u03bb or T: tap to switch", tap: (st, c) => { st.i = 1 - st.i; return ""; } }],
    show: (st) => st.i ? "displacement-time graph: crest to crest is the period T = 0.50 s" : "snapshot: crest to crest is the wavelength \u03bb = 2.0 m",
  });
  ctx.art.touchable(["gr"]);
  return { destroy() {} };
}
