// Depth: Eject from deeper in the metal.
import { calc, f2 } from "../kit.js";
const F = f2, E = (x, d = 2) => x.toExponential(d).replace(/e\+?(-?)(\d+)/, (_, s, p) => " \u00d7 10^" + (s ? "\u2212" : "") + p).replace("-", "\u2212"), R = (a) => a[Math.floor(Math.random() * a.length)];
export default function build(ctx) {
  const k = calc(ctx, {
    st: {},
    sliders: [{ key: "d", label: "Depth", min: 0, max: 5, step: 1, value: 0, unit: "layers", d: 0 }],
    cuts: [
    { id: "try", label: "Metal: tap to explain", tap: (st, c) => { return "Surface electrons get the maximum KE."; } }],
    show: (st) => `KE = ${F(Math.max(0, 1.5 - 0.3 * st.d), 1)} eV (max 1.5 eV)`,
  });
  ctx.art.touchable(["try"]);
  return { destroy() {} };
}
