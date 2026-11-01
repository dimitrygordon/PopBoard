// v = sqrt(G m_E / r), T = 2 pi r / v around Earth (m_E = 5.97e24 kg).
import { calc, f2 } from "../kit.js";
const F = f2, E = (x, d = 2) => x.toExponential(d).replace(/e\+?(-?)(\d+)/, (_, s, p) => " \u00d7 10^" + (s ? "\u2212" : "") + p).replace("-", "\u2212"), R = (a) => a[Math.floor(Math.random() * a.length)];
export default function build(ctx) {
  const k = calc(ctx, {
    st: { m: 500 },
    sliders: [{ key: "r", label: "Orbit radius", min: 6.6, max: 42, step: 0.2, value: 7, unit: "\\u00d7 10\\u2076 m", d: 1 }],
    cuts: [
    { id: "r", label: "Satellite: tap to change its mass", tap: (st, c) => { st.m = st.m === 500 ? 5000 : 500; return "Mass changed. Speed and period did not."; } }],
    show: (st) => (() => { const r = st.r * 1e6, v = Math.sqrt(6.67e-11 * 5.97e24 / r); return `satellite ${st.m} kg\nv = ${F(v / 1000, 2)} km/s, T = ${F(2 * Math.PI * r / v / 60, 0)} min`; })(),
  });
  ctx.art.touchable(["r"]);
  return { destroy() {} };
}
