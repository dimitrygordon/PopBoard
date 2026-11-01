// Static friction gauge: mu_s 0.10 to 1.0 (0.50), F_N 10 to 200 N (100), push 0 to 200 N (30). f_s = push up to mu_s F_N.
import { calc, f2, deg, rad2 } from "../kit.js";
export default function build(ctx) {
  calc(ctx, {
    st: {},
    sliders: [{ key: "u", label: "mu_s", min: 0.1, max: 1, step: 0.05, value: 0.5, unit: "", d: 2 }, { key: "N", label: "Normal force", min: 10, max: 200, step: 5, value: 100, unit: "N", d: 0 }, { key: "F", label: "Push", min: 0, max: 200, step: 5, value: 30, unit: "N", d: 0 }],
    cuts: [
    { id: "push", label: "Push: tap to add 10 N", tap: (st, c) => { st.F = Math.min(200, st.F + 10); c.F.set(st.F); return st.F > st.u * st.N ? "Static friction has hit its limit: the object starts to slide." : ""; } }],
    show: (st) => { const L = st.u * st.N; return st.F <= L ? `f_s = ${st.F} N (limit ${f2(L, 0)} N)` : `push ${st.F} N > ${f2(L, 0)} N: sliding`; },
  });
  ctx.art.touchable(["push"]);
  return { destroy() {} };
}
