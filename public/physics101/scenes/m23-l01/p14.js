// Gallium: Add gallium atoms.
import { calc, f2 } from "../kit.js";
const F = f2, E = (x, d = 2) => x.toExponential(d).replace(/e\+?(-?)(\d+)/, (_, s, p) => " \u00d7 10^" + (s ? "\u2212" : "") + p).replace("-", "\u2212"), R = (a) => a[Math.floor(Math.random() * a.length)];
export default function build(ctx) {
  const k = calc(ctx, {
    st: {},
    sliders: [{ key: "n", label: "Gallium atoms", min: 0, max: 5, step: 1, value: 1, unit: "", d: 0 }],
    cuts: [
    { id: "try", label: "Lattice: tap to explain", tap: (st, c) => { return "Each gallium leaves a hole (p-type)."; } }],
    show: (st) => `${st.n} hole${st.n === 1 ? "" : "s"}`,
  });
  ctx.art.touchable(["try"]);
  return { destroy() {} };
}
