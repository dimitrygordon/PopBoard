// Centripetal acceleration: tap to move the object a quarter turn; the acceleration always points to the center.
import { calc, f2, deg, rad2 } from "../kit.js";
export default function build(ctx) {
  calc(ctx, {
    st: { a: 0 },
    sliders: [],
    cuts: [
    { id: "a", label: "Acceleration arrow: tap to move on", tap: (st) => { st.a = (st.a + 90) % 360; return "The acceleration still points at the center."; } }],
    show: (st) => `object at ${st.a}\u00b0: a points toward the center, ${(st.a + 180) % 360}\u00b0`,
  });
  ctx.art.touchable(["a"]);
  return { destroy() {} };
}
