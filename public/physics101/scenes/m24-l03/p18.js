// Pair production: Dial the gamma energy.
import { calc, f2 } from "../kit.js";
const F = f2, E = (x, d = 2) => x.toExponential(d).replace(/e\+?(-?)(\d+)/, (_, s, p) => " \u00d7 10^" + (s ? "\u2212" : "") + p).replace("-", "\u2212"), R = (a) => a[Math.floor(Math.random() * a.length)];
export default function build(ctx) {
  const k = calc(ctx, {
    st: {},
    sliders: [{ key: "e", label: "E", min: 0.5, max: 3, step: 0.01, value: 1, unit: "MeV", d: 2 }],
    cuts: [
    { id: "try", label: "Gamma: tap to explain", tap: (st, c) => { return "Needs 1.02 MeV."; } }],
    show: (st) => st.e >= 1.02 ? "electron-positron pair appears" : "below 1.02 MeV: no pair",
  });
  ctx.art.touchable(["try"]);
  return { destroy() {} };
}
