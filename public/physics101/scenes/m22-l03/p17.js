// Emit: Choose the starting level for a drop to n = 2.
import { calc, f2 } from "../kit.js";
const F = f2, E = (x, d = 2) => x.toExponential(d).replace(/e\+?(-?)(\d+)/, (_, s, p) => " \u00d7 10^" + (s ? "\u2212" : "") + p).replace("-", "\u2212"), R = (a) => a[Math.floor(Math.random() * a.length)];
export default function build(ctx) {
  const k = calc(ctx, {
    st: {},
    sliders: [{ key: "n", label: "From n", min: 3, max: 6, step: 1, value: 3, unit: "", d: 0 }],
    cuts: [
    { id: "try", label: "Photon: tap to explain", tap: (st, c) => { return "Bigger drop, bluer photon."; } }],
    show: (st) => (() => { const e = 13.6 * (1 / 4 - 1 / st.n ** 2); return `E = ${F(e, 2)} eV, \u03bb = ${F(1240 / e, 0)} nm`; })(),
  });
  ctx.art.touchable(["try"]);
  return { destroy() {} };
}
