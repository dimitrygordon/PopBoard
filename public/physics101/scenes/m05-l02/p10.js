// Example Problem 3: mass 5 to 100 kg (25.0), mu_k 0.05 to 0.80 (0.20). Constant speed, so push = mu_k m g = 49 N in the example.
import { calc, f2, deg, rad2 } from "../kit.js";
export default function build(ctx) {
  calc(ctx, {
    st: {},
    sliders: [{ key: "m", label: "Mass", min: 5, max: 100, step: 1, value: 25, unit: "kg", d: 0 }, { key: "u", label: "mu_k", min: 0.05, max: 0.8, step: 0.05, value: 0.2, unit: "", d: 2 }],
    cuts: [
    { id: "box", label: "Box: tap for the worked example", tap: (st, c) => { st.m = 25; st.u = 0.2; c.m.set(25); c.u.set(0.2); return "0.20 times 245 newtons: a 49 newton push."; } }],
    show: (st) => `F_N = ${f2(st.m * 9.8, 0)} N\npush = \u03bc_k F_N = ${f2(st.u * st.m * 9.8, 0)} N`,
  });
  ctx.art.touchable(["box"]);
  return { destroy() {} };
}
