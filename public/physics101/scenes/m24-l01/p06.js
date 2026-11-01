// Notation: Change the neutrons.
import { calc, f2 } from "../kit.js";
const F = f2, E = (x, d = 2) => x.toExponential(d).replace(/e\+?(-?)(\d+)/, (_, s, p) => " \u00d7 10^" + (s ? "\u2212" : "") + p).replace("-", "\u2212"), R = (a) => a[Math.floor(Math.random() * a.length)];
export default function build(ctx) {
  const k = calc(ctx, {
    st: {},
    sliders: [{ key: "z", label: "Z", min: 1, max: 2, step: 1, value: 1, unit: "", d: 0 }, { key: "n", label: "N", min: 0, max: 2, step: 1, value: 0, unit: "", d: 0 }],
    cuts: [
    { id: "try", label: "Symbol: tap to explain", tap: (st, c) => { return "A on top, Z below."; } }],
    show: (st) => `${st.z === 1 ? "H" : "He"}-${st.z + st.n}: A = ${st.z + st.n}, Z = ${st.z}`,
  });
  ctx.art.touchable(["try"]);
  return { destroy() {} };
}
