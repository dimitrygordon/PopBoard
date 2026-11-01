// Model atom: Add or remove electrons from a neutral atom with 6 protons.
import { calc, f2 } from "../kit.js";
const F = f2, E = (x, d = 2) => x.toExponential(d).replace(/e\+?(-?)(\d+)/, (_, s, p) => " \u00d7 10^" + (s ? "\u2212" : "") + p).replace("-", "\u2212"), R = (a) => a[Math.floor(Math.random() * a.length)];
export default function build(ctx) {
  const k = calc(ctx, {
    st: {},
    sliders: [{ key: "e", label: "Electrons", min: 3, max: 9, step: 1, value: 6, unit: "", d: 0 }],
    cuts: [
    { id: "try", label: "Atom: tap to explain", tap: (st, c) => { return "Net charge = protons \u2212 electrons."; } }],
    show: (st) => `net charge: ${6 - st.e > 0 ? "+" : ""}${6 - st.e}e` + (st.e === 6 ? " (neutral)" : st.e > 6 ? " (negative ion)" : " (positive ion)"),
  });
  ctx.art.touchable(["try"]);
  return { destroy() {} };
}
