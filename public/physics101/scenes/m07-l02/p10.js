// g = G m / r^2 around Earth; arrow toward the center.
import { calc, f2 } from "../kit.js";
const F = f2, E = (x, d = 2) => x.toExponential(d).replace(/e\+?(-?)(\d+)/, (_, s, p) => " \u00d7 10^" + (s ? "\u2212" : "") + p).replace("-", "\u2212"), R = (a) => a[Math.floor(Math.random() * a.length)];
export default function build(ctx) {
  const k = calc(ctx, {
    st: { d: 0, D: ["above", "to the left of", "below", "to the right of"], A: ["down", "right", "up", "left"] },
    sliders: [{ key: "r", label: "Distance", min: 1, max: 5, step: 0.1, value: 2, unit: "r_E", d: 1 }],
    cuts: [
    { id: "probe", label: "Probe: tap to move it around the planet", tap: (st, c) => { st.d = (st.d + 1) % 4; return ""; } }],
    show: (st) => `probe ${st.D[st.d]} the planet at ${F(st.r, 1)} r_E\ng = ${F(9.8 / st.r ** 2, 2)} N/kg, pointing ${st.A[st.d]} (toward the center)`,
  });
  ctx.art.touchable(["probe"]);
  return { destroy() {} };
}
