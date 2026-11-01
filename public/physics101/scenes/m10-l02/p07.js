// KE and GPE: Slide the 0.50 kg ball's height during a toss at 6.0 m/s. KE and GPE trade; the total stays 9.0 J.
import { calc, f2 } from "../kit.js";
const F = f2, E = (x, d = 2) => x.toExponential(d).replace(/e\+?(-?)(\d+)/, (_, s, p) => " \u00d7 10^" + (s ? "\u2212" : "") + p).replace("-", "\u2212"), R = (a) => a[Math.floor(Math.random() * a.length)];
export default function build(ctx) {
  const k = calc(ctx, {
    st: {},
    sliders: [{ key: "h", label: "Height", min: 0, max: 1.8, step: 0.05, value: 0, unit: "m", d: 2 }],
    cuts: [
    { id: "gpe", label: "Gpe: tap to jump to the top", tap: (st, c) => { st.h = 1.8; c.h.set(1.8); return "At the top all 9.0 J is GPE."; } }],
    show: (st) => `GPE = ${F(0.5 * 9.8 * st.h, 1)} J, KE = ${F(9 - 0.5 * 9.8 * st.h, 1)} J\ntotal 9.0 J`,
  });
  ctx.art.touchable(["gpe"]);
  return { destroy() {} };
}
