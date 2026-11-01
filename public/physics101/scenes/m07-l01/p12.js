// Units: solar masses and AU, so T in years = sqrt(r^3 / M).
import { calc, f2 } from "../kit.js";
const F = f2, E = (x, d = 2) => x.toExponential(d).replace(/e\+?(-?)(\d+)/, (_, s, p) => " \u00d7 10^" + (s ? "\u2212" : "") + p).replace("-", "\u2212"), R = (a) => a[Math.floor(Math.random() * a.length)];
export default function build(ctx) {
  const k = calc(ctx, {
    st: {},
    sliders: [{ key: "M", label: "Star mass", min: 0.2, max: 5, step: 0.1, value: 1, unit: "Suns", d: 1 }, { key: "r", label: "Orbit radius", min: 0.2, max: 10, step: 0.1, value: 1, unit: "AU", d: 1 }],
    cuts: [
    { id: "star", label: "Star: tap to set up our Sun and Earth", tap: (st, c) => { st.M = 1; st.r = 1; c.M.set(1); c.r.set(1); return "One Sun, one AU: one year."; } }],
    show: (st) => `T = 2\u03c0\u221a(r\u00b3 / Gm) = ${F(Math.sqrt(st.r ** 3 / st.M), 2)} years`,
  });
  ctx.art.touchable(["star"]);
  return { destroy() {} };
}
