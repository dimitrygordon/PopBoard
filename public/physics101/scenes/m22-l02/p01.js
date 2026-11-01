// Electrons: Fire more electrons through the double slit.
import { calc, f2 } from "../kit.js";
const F = f2, E = (x, d = 2) => x.toExponential(d).replace(/e\+?(-?)(\d+)/, (_, s, p) => " \u00d7 10^" + (s ? "\u2212" : "") + p).replace("-", "\u2212"), R = (a) => a[Math.floor(Math.random() * a.length)];
export default function build(ctx) {
  const k = calc(ctx, {
    st: {},
    sliders: [{ key: "n", label: "Electrons", min: 0, max: 10000, step: 500, value: 500, unit: "", d: 0 }],
    cuts: [
    { id: "try", label: "Screen: tap to explain", tap: (st, c) => { return "One by one, they build an interference pattern."; } }],
    show: (st) => st.n < 1000 ? "scattered dots" : "bright and dark fringes",
  });
  ctx.art.touchable(["try"]);
  return { destroy() {} };
}
