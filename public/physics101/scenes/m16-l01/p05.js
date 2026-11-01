// Roughness: Slide the surface roughness under parallel laser rays.
import { calc, f2 } from "../kit.js";
const F = f2, E = (x, d = 2) => x.toExponential(d).replace(/e\+?(-?)(\d+)/, (_, s, p) => " \u00d7 10^" + (s ? "\u2212" : "") + p).replace("-", "\u2212"), R = (a) => a[Math.floor(Math.random() * a.length)];
export default function build(ctx) {
  const k = calc(ctx, {
    st: {},
    sliders: [{ key: "r", label: "Roughness", min: 0, max: 10, step: 1, value: 0, unit: "", d: 0 }],
    cuts: [
    { id: "try", label: "Surface: tap to explain", tap: (st, c) => { return "Each ray still obeys the law of reflection at its own tiny patch."; } }],
    show: (st) => st.r === 0 ? "specular: rays leave parallel" : st.r < 4 ? "slightly diffuse: rays spread a little" : "diffuse: rays scatter everywhere",
  });
  ctx.art.touchable(["try"]);
  return { destroy() {} };
}
