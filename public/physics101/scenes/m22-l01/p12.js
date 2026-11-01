// Photons: Fire photons at the solar cell (threshold 1.1 eV).
import { calc, f2 } from "../kit.js";
const F = f2, E = (x, d = 2) => x.toExponential(d).replace(/e\+?(-?)(\d+)/, (_, s, p) => " \u00d7 10^" + (s ? "\u2212" : "") + p).replace("-", "\u2212"), R = (a) => a[Math.floor(Math.random() * a.length)];
export default function build(ctx) {
  const k = calc(ctx, {
    st: {},
    sliders: [{ key: "e", label: "Photon energy", min: 0.5, max: 3, step: 0.1, value: 1.5, unit: "eV", d: 1 }],
    cuts: [
    { id: "try", label: "Cell: tap to explain", tap: (st, c) => { return "One photon frees one electron, if it has enough energy."; } }],
    show: (st) => st.e >= 1.1 ? "electron freed" : "no electron",
  });
  ctx.art.touchable(["try"]);
  return { destroy() {} };
}
