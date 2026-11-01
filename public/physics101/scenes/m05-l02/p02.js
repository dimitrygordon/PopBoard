// Static friction: push a 50 kg couch 0 to 400 N (sandbox mu_s 0.50, mu_k 0.40). Static friction matches the push up to 245 N, then it breaks free and kinetic friction is 196 N.
import { calc, f2, deg, rad2 } from "../kit.js";
export default function build(ctx) {
  calc(ctx, {
    st: { },
    sliders: [{ key: "F", label: "Push", min: 0, max: 400, step: 5, value: 100, unit: "N", d: 0 }],
    cuts: [
    { id: "push", label: "Push: tap to add 50 N", tap: (st, c) => { st.F = (st.F + 50) % 450; c.F.set(st.F); return st.F > 245 ? "Past 245 newtons the couch breaks free." : `Static friction matches your ${st.F} newtons.`; } }],
    show: (st) => st.F <= 245 ? `push ${st.F} N, static friction ${st.F} N\ncouch stays put (limit 245 N)` : `push ${st.F} N > 245 N: it slides\nkinetic friction 196 N, a = ${f2((st.F - 196) / 50, 2)} m/s\u00b2`,
  });
  ctx.art.touchable(["push"]);
  return { destroy() {} };
}
