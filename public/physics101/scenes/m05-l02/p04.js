// What affects friction: a 2.0 kg block (sandbox). Toggle the area, speed, material (wood 0.30, rubber 0.80, ice 0.030; sandbox mu_k values) and an extra 2.0 kg on top. f = mu_k F_N: only material and normal force matter.
import { calc, f2, deg, rad2 } from "../kit.js";
export default function build(ctx) {
  calc(ctx, {
    st: { a: false, s: false, m: 0, n: false, mu: [0.3, 0.8, 0.03], names: ["wood", "rubber", "ice"] },
    sliders: [],
    cuts: [
    { id: "block", label: "Block: tap to pull and read friction", tap: (st) => `Friction reads ${f2(st.mu[st.m] * (st.n ? 4 : 2) * 9.8, 1)} newtons.` },
    { id: "k0", label: "Contact area: tap to change", tap: (st) => { st.a = !st.a; return "Area changed. Friction did not."; } },
    { id: "k1", label: "Sliding speed: tap to change", tap: (st) => { st.s = !st.s; return "Speed changed. Friction did not."; } },
    { id: "k2", label: "Surface material: tap to change", tap: (st) => { st.m = (st.m + 1) % 3; return `On ${st.names[st.m]}, friction changes.`; } },
    { id: "k3", label: "Normal force: tap to add or remove 2 kg", tap: (st) => { st.n = !st.n; return st.n ? "Doubling the normal force doubles friction." : ""; } }],
    show: (st) => `${st.a ? "on its side" : "flat"}, ${st.s ? "fast" : "slow"}, ${st.names[st.m]}, F_N = ${f2((st.n ? 4 : 2) * 9.8, 1)} N\nf_k = ${f2(st.mu[st.m] * (st.n ? 4 : 2) * 9.8, 1)} N`,
    box: [1000, 560, 1590, 660],
  });
  ctx.art.touchable(["block", "k0", "k1", "k2", "k3"]);
  return { destroy() {} };
}
