// Equilibrant: F1 0 to 10 N along +x (6.0), F2 0 to 10 N along +y (8.0). Tap third force to add the equilibrant: same size as R, opposite direction.
import { calc, f2, deg, rad2 } from "../kit.js";
export default function build(ctx) {
  calc(ctx, {
    st: { e: false },
    sliders: [{ key: "a", label: "F1", min: 0, max: 10, step: 0.5, value: 6, unit: "N", d: 1 }, { key: "b", label: "F2", min: 0, max: 10, step: 0.5, value: 8, unit: "N", d: 1 }],
    cuts: [
    { id: "third", label: "Third force: tap to add the equilibrant", tap: (st) => { st.e = !st.e; return st.e ? "The equilibrant cancels the resultant, so the object stops accelerating." : ""; } }],
    show: (st) => { const R = Math.hypot(st.a, st.b), t = rad2(Math.atan2(st.b, st.a)); return `R = ${f2(R, 1)} N at ${f2(t, 0)}\u00b0` + (st.e ? `\nequilibrant ${f2(R, 1)} N at ${f2(t + 180, 0)}\u00b0` : ""); },
  });
  ctx.art.touchable(["third"]);
  return { destroy() {} };
}
