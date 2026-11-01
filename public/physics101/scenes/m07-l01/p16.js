// F = G m1 m2 / r^2 for three pairs.
import { calc, f2 } from "../kit.js";
const F = f2, E = (x, d = 2) => x.toExponential(d).replace(/e\+?(-?)(\d+)/, (_, s, p) => " \u00d7 10^" + (s ? "\u2212" : "") + p).replace("-", "\u2212"), R = (a) => a[Math.floor(Math.random() * a.length)];
export default function build(ctx) {
  const k = calc(ctx, {
    st: { i: 0, P: [["two 7.3 kg bowling balls", 7.3, 7.3, 0.3], ["you (60 kg) and Earth", 60, 5.97e24, 6.38e6], ["Earth and the Moon", 5.97e24, 7.35e22, 3.84e8]] },
    sliders: [{ key: "s", label: "Separation \\u00d7", min: 0.5, max: 3, step: 0.1, value: 1, unit: "\\u00d7", d: 1 }],
    cuts: [
    { id: "any", label: "Any: tap for the next pair", tap: (st, c) => { st.i = (st.i + 1) % 3; return ""; } }],
    show: (st) => (() => { const p = st.P[st.i]; return `${p[0]}, r = ${E(p[3] * st.s)} m\nF = ${E(6.67e-11 * p[1] * p[2] / (p[3] * st.s) ** 2)} N`; })(),
  });
  ctx.art.touchable(["any"]);
  return { destroy() {} };
}
