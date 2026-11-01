// Coefficients of friction: Table 2-style pairs (rubber on dry concrete 0.80, steel on steel 0.74, wood on wood 0.42, Teflon on Teflon 0.04 as mu_s) with oil x0.25 or dust x0.7 (sandbox multipliers). F_N = 100 N.
import { calc, f2, deg, rad2 } from "../kit.js";
export default function build(ctx) {
  calc(ctx, {
    st: { p: 0, o: 0, u: [0.8, 0.74, 0.42, 0.04], k: [1, 0.25, 0.7], n: ["rubber on dry concrete", "steel on steel", "wood on wood", "Teflon on Teflon"] },
    sliders: [],
    cuts: [
    { id: "c0", label: "Surfaces: tap for the next pair", tap: (st) => { st.p = (st.p + 1) % 4; return ""; } },
    { id: "c1", label: "Oil or dust: tap to change", tap: (st) => { st.o = (st.o + 1) % 3; return st.o === 1 ? "Oil makes sliding much easier." : st.o === 2 ? "Dust lowers friction a little." : ""; } }],
    show: (st) => { const u = st.u[st.p] * st.k[st.o]; return `${st.n[st.p]}, ${["clean", "oiled", "dusty"][st.o]}\nforce to start sliding: ${f2(u * 100, 0)} N`; },
  });
  ctx.art.touchable(["c0", "c1"]);
  return { destroy() {} };
}
