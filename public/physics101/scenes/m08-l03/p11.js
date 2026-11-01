// Mass 0.20 kg at r = 0.30 m, spring k = 50 N/m (sandbox); F = m omega^2 r.
import { calc, f2 } from "../kit.js";
const F = f2, E = (x, d = 2) => x.toExponential(d).replace(/e\+?(-?)(\d+)/, (_, s, p) => " \u00d7 10^" + (s ? "\u2212" : "") + p).replace("-", "\u2212"), R = (a) => a[Math.floor(Math.random() * a.length)];
export default function build(ctx) {
  const k = calc(ctx, {
    st: {},
    sliders: [{ key: "w", label: "Spin rate", min: 0, max: 10, step: 0.5, value: 4, unit: "rad/s", d: 1 }],
    cuts: [
    { id: "spring", label: "Spring: tap to double the spin", tap: (st, c) => { st.w = st.w >= 5 ? 1 : st.w * 2; c.w.set(st.w); return "Twice the spin: four times the force."; } }],
    show: (st) => `F = m\u03c9\u00b2r = ${F(0.2 * st.w ** 2 * 0.3, 2)} N, spring stretches ${F(0.2 * st.w ** 2 * 0.3 / 50 * 100, 1)} cm`,
  });
  ctx.art.touchable(["spring"]);
  return { destroy() {} };
}
