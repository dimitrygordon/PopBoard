// Beams: Add beam angles.
import { calc, f2 } from "../kit.js";
const F = f2, E = (x, d = 2) => x.toExponential(d).replace(/e\+?(-?)(\d+)/, (_, s, p) => " \u00d7 10^" + (s ? "\u2212" : "") + p).replace("-", "\u2212"), R = (a) => a[Math.floor(Math.random() * a.length)];
export default function build(ctx) {
  const k = calc(ctx, {
    st: {},
    sliders: [{ key: "n", label: "Angles", min: 1, max: 8, step: 1, value: 1, unit: "", d: 0 }],
    cuts: [
    { id: "try", label: "Tumor: tap to explain", tap: (st, c) => { return "Many angles: tumor gets the sum, healthy tissue a share."; } }],
    show: (st) => `tumor dose \u00d7 ${st.n}; healthy tissue dose \u00d7 1`,
  });
  ctx.art.touchable(["try"]);
  return { destroy() {} };
}
