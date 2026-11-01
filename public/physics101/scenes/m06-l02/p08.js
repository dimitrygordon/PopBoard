// Hammer release: tap to let go at the next point (every 45 degrees, counterclockwise swing). It flies along the tangent: 90 degrees ahead of its position angle.
import { calc, f2, deg, rad2 } from "../kit.js";
export default function build(ctx) {
  calc(ctx, {
    st: { a: 0 },
    sliders: [],
    cuts: [
    { id: "rel", label: "Release: tap to let go", tap: (st) => { st.a = (st.a + 45) % 360; return "It flies off along the tangent, not outward."; } }],
    show: (st) => `released at ${st.a}\u00b0: flies toward ${(st.a + 90) % 360}\u00b0 (tangent)`,
  });
  ctx.art.touchable(["rel"]);
  return { destroy() {} };
}
