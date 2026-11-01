// Strip electrons: Set how many electrons are stripped from neon-20.
import { calc, f2 } from "../kit.js";
const F = f2, E = (x, d = 2) => x.toExponential(d).replace(/e\+?(-?)(\d+)/, (_, s, p) => " \u00d7 10^" + (s ? "\u2212" : "") + p).replace("-", "\u2212"), R = (a) => a[Math.floor(Math.random() * a.length)];
export default function build(ctx) {
  const k = calc(ctx, {
    st: {},
    sliders: [{ key: "q", label: "Electrons removed", min: 1, max: 4, step: 1, value: 1, unit: "", d: 0 }],
    cuts: [
    { id: "try", label: "Ion: tap to explain", tap: (st, c) => { return "More charge, smaller circle."; } }],
    show: (st) => `q = +${st.q}e\nr = ${F(Math.sqrt(2 * 34 * 20 * 1.67e-27 / (st.q * 1.602e-19)) / 0.05 * 1000, 0)} mm`,
  });
  ctx.art.touchable(["try"]);
  return { destroy() {} };
}
