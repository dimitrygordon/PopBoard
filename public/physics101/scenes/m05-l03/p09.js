// Surfaces: drag a 1.0 kg block over smooth plastic (mu 0.20), a clingfish-style hairy pad (0.90) and shark-skin texture (0.15). All three values are sandbox estimates.
import { calc, f2, deg, rad2 } from "../kit.js";
export default function build(ctx) {
  calc(ctx, {
    st: { k: 0, u: [0.2, 0.9, 0.15], n: ["smooth", "clingfish-style", "shark skin"] },
    sliders: [],
    cuts: [
    { id: "s0", label: "Smooth surface", tap: (st) => { st.k = 0; return ""; } },
    { id: "s1", label: "Clingfish-style surface", tap: (st) => { st.k = 1; return "The hairy pad grips: friction is several times higher."; } },
    { id: "s2", label: "Shark-skin surface", tap: (st) => { st.k = 2; return ""; } }],
    show: (st) => `${st.n[st.k]}: friction ${f2(st.u[st.k] * 9.8, 1)} N`,
  });
  ctx.art.touchable(["s0", "s1", "s2"]);
  return { destroy() {} };
}
