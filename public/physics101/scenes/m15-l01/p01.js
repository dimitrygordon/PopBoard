// Shadow: Tap the object to put it in the beam or take it out.
import { calc, f2 } from "../kit.js";
const F = f2, E = (x, d = 2) => x.toExponential(d).replace(/e\+?(-?)(\d+)/, (_, s, p) => " \u00d7 10^" + (s ? "\u2212" : "") + p).replace("-", "\u2212"), R = (a) => a[Math.floor(Math.random() * a.length)];
export default function build(ctx) {
  const k = calc(ctx, {
    st: { i: 1 },
    sliders: [],
    cuts: [
    { id: "beam", label: "Shadow: tap to toggle the object", tap: (st, c) => { st.i = 1 - st.i; return st.i ? "Light travels in straight lines, so the edge is sharp." : ""; } }],
    show: (st) => st.i ? "object in the beam: sharp shadow" : "no object: the wall is evenly lit",
  });
  ctx.art.touchable(["beam"]);
  return { destroy() {} };
}
