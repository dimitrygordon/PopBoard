// Coefficient of kinetic friction: three surfaces, sandpaper 0.50 (Table 1 slope), wood 0.30, ice 0.030 (sandbox values). F_N 1 to 8 N (4.0); the slope of f vs F_N is mu_k.
import { calc, f2, deg, rad2 } from "../kit.js";
export default function build(ctx) {
  calc(ctx, {
    st: { m: 0, mu: [0.5, 0.3, 0.03], names: ["sandpaper", "wood", "ice"] },
    sliders: [{ key: "N", label: "Normal force", min: 1, max: 8, step: 0.5, value: 4, unit: "N", d: 1 }],
    cuts: [
    { id: "surf", label: "Surface: tap to change", tap: (st) => { st.m = (st.m + 1) % 3; return `On ${st.names[st.m]} the line\u2019s slope is ${st.mu[st.m]}.`; } }],
    show: (st) => `${st.names[st.m]}: slope \u03bc_k = ${st.mu[st.m]}\nf_k = ${f2(st.mu[st.m] * st.N, 2)} N`,
  });
  ctx.art.touchable(["surf"]);
  return { destroy() {} };
}
