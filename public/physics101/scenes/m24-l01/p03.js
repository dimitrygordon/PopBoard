// Nucleus: Add protons and neutrons.
import { calc, f2 } from "../kit.js";
const F = f2, E = (x, d = 2) => x.toExponential(d).replace(/e\+?(-?)(\d+)/, (_, s, p) => " \u00d7 10^" + (s ? "\u2212" : "") + p).replace("-", "\u2212"), R = (a) => a[Math.floor(Math.random() * a.length)];
export default function build(ctx) {
  const k = calc(ctx, {
    st: {},
    sliders: [{ key: "z", label: "Protons Z", min: 1, max: 10, step: 1, value: 2, unit: "", d: 0 }, { key: "n", label: "Neutrons N", min: 0, max: 12, step: 1, value: 2, unit: "", d: 0 }],
    cuts: [
    { id: "try", label: "Nucleus: tap to explain", tap: (st, c) => { return "A = Z + N."; } }],
    show: (st) => `Z = ${st.z}, A = ${st.z + st.n}, charge +${st.z}e, mass \u2248 ${st.z + st.n} u`,
  });
  ctx.art.touchable(["try"]);
  return { destroy() {} };
}
