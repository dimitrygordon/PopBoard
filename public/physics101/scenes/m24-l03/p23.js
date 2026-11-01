// Higgs: Change the interaction strength.
import { calc, f2 } from "../kit.js";
const F = f2, E = (x, d = 2) => x.toExponential(d).replace(/e\+?(-?)(\d+)/, (_, s, p) => " \u00d7 10^" + (s ? "\u2212" : "") + p).replace("-", "\u2212"), R = (a) => a[Math.floor(Math.random() * a.length)];
export default function build(ctx) {
  const k = calc(ctx, {
    st: {},
    sliders: [{ key: "k", label: "Interaction", min: 0, max: 10, step: 1, value: 3, unit: "", d: 0 }],
    cuts: [
    { id: "try", label: "Particle: tap to explain", tap: (st, c) => { return "Stronger interaction, more mass."; } }],
    show: (st) => `mass: ${st.k === 0 ? "none (like a photon)" : st.k * 10 + " units"}`,
  });
  ctx.art.touchable(["try"]);
  return { destroy() {} };
}
