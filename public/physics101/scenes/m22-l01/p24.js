// Angle: Change the scattering angle.
import { calc, f2 } from "../kit.js";
const F = f2, E = (x, d = 2) => x.toExponential(d).replace(/e\+?(-?)(\d+)/, (_, s, p) => " \u00d7 10^" + (s ? "\u2212" : "") + p).replace("-", "\u2212"), R = (a) => a[Math.floor(Math.random() * a.length)];
export default function build(ctx) {
  const k = calc(ctx, {
    st: {},
    sliders: [{ key: "a", label: "Angle", min: 0, max: 180, step: 10, value: 90, unit: "\\u00b0", d: 0 }],
    cuts: [
    { id: "try", label: "Photon: tap to explain", tap: (st, c) => { return "Bigger angle, bigger stretch."; } }],
    show: (st) => `\u0394\u03bb = ${F(2.43 * (1 - Math.cos(st.a * Math.PI / 180)), 2)} pm`,
  });
  ctx.art.touchable(["try"]);
  return { destroy() {} };
}
