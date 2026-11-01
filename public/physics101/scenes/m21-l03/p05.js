// Circle: Change B with the electric field off (v = 2.0 \u00d7 10\u2077 m/s).
import { calc, f2 } from "../kit.js";
const F = f2, E = (x, d = 2) => x.toExponential(d).replace(/e\+?(-?)(\d+)/, (_, s, p) => " \u00d7 10^" + (s ? "\u2212" : "") + p).replace("-", "\u2212"), R = (a) => a[Math.floor(Math.random() * a.length)];
export default function build(ctx) {
  const k = calc(ctx, {
    st: {},
    sliders: [{ key: "b", label: "B", min: 1, max: 10, step: 0.5, value: 3.5, unit: "mT", d: 1 }],
    cuts: [
    { id: "try", label: "Beam: tap to explain", tap: (st, c) => { return "Stronger B, tighter circle."; } }],
    show: (st) => `r = mv/qB = ${F(9.11e-31 * 2e7 / (st.b * 1e-3 * 1.602e-19) * 100, 2)} cm`,
  });
  ctx.art.touchable(["try"]);
  return { destroy() {} };
}
