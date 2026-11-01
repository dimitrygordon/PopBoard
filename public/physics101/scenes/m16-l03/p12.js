// Prism: Rotate the prism (n_red 1.513, n_violet 1.532).
import { calc, f2 } from "../kit.js";
const F = f2, E = (x, d = 2) => x.toExponential(d).replace(/e\+?(-?)(\d+)/, (_, s, p) => " \u00d7 10^" + (s ? "\u2212" : "") + p).replace("-", "\u2212"), R = (a) => a[Math.floor(Math.random() * a.length)];
export default function build(ctx) {
  const k = calc(ctx, {
    st: {},
    sliders: [{ key: "a", label: "Angle of incidence", min: 30, max: 70, step: 1, value: 45, unit: "\\u00b0", d: 0 }],
    cuts: [
    { id: "try", label: "Prism: tap to explain", tap: (st, c) => { return "Violet has the larger n, so it bends most."; } }],
    show: (st) => (() => { const d = (n) => Math.asin(Math.sin(st.a * Math.PI / 180) / n) * 180 / Math.PI; return `inside the glass: red ${F(d(1.513), 2)}\u00b0, violet ${F(d(1.532), 2)}\u00b0`; })(),
  });
  ctx.art.touchable(["try"]);
  return { destroy() {} };
}
