// Disk: Tap to zoom into the disk's shadow.
import { calc, f2 } from "../kit.js";
const F = f2, E = (x, d = 2) => x.toExponential(d).replace(/e\+?(-?)(\d+)/, (_, s, p) => " \u00d7 10^" + (s ? "\u2212" : "") + p).replace("-", "\u2212"), R = (a) => a[Math.floor(Math.random() * a.length)];
export default function build(ctx) {
  const k = calc(ctx, {
    st: { z: 0 },
    sliders: [],
    cuts: [
    { id: "try", label: "Shadow: tap to zoom", tap: (st, c) => { st.z = 1 - st.z; return st.z ? "A bright spot at the center: only a wave can do that." : ""; } }],
    show: (st) => st.z ? "zoomed in: bright spot in the center of the shadow" : "a round shadow",
  });
  ctx.art.touchable(["try"]);
  return { destroy() {} };
}
