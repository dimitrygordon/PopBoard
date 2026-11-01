// g = G m_E / r^2, r = r_E + h.
import { calc, f2 } from "../kit.js";
const F = f2, E = (x, d = 2) => x.toExponential(d).replace(/e\+?(-?)(\d+)/, (_, s, p) => " \u00d7 10^" + (s ? "\u2212" : "") + p).replace("-", "\u2212"), R = (a) => a[Math.floor(Math.random() * a.length)];
export default function build(ctx) {
  const k = calc(ctx, {
    st: {},
    sliders: [{ key: "h", label: "Height above Earth", min: 0, max: 40000, step: 200, value: 0, unit: "km", d: 0 }],
    cuts: [
    { id: "lift", label: "Lift: tap to jump to one Earth radius up", tap: (st, c) => { st.h = st.h === 6380 ? 0 : 6380; c.h.set(st.h); return st.h ? "Twice as far from the center: one quarter of g." : ""; } }],
    show: (st) => `r = ${F((6380 + st.h) / 6380, 2)} r_E\ng = ${F(6.67e-11 * 5.97e24 / ((6.38e6 + st.h * 1e3) ** 2), 2)} m/s\u00b2`,
  });
  ctx.art.touchable(["lift"]);
  return { destroy() {} };
}
