// Kepler's second law on an orbit with e = 0.5 (sandbox): each step sweeps the same area; speed scales as 1/r, so it is 3 times faster at perihelion than aphelion.
import { calc, f2 } from "../kit.js";
const F = f2, E = (x, d = 2) => x.toExponential(d).replace(/e\+?(-?)(\d+)/, (_, s, p) => " \u00d7 10^" + (s ? "\u2212" : "") + p).replace("-", "\u2212"), R = (a) => a[Math.floor(Math.random() * a.length)];
export default function build(ctx) {
  const k = calc(ctx, {
    st: { s: 0 },
    sliders: [],
    cuts: [
    { id: "sweep", label: "Sweep: tap to shade the next time step", tap: (st, c) => { st.s = (st.s + 1) % 8; return st.s === 0 ? "Near the Sun the wedge is short and wide; far away it is long and thin. Same area." : ""; } }],
    show: (st) => `step ${st.s + 1} of 8: area swept = the same every step\ndistance r = ${F(1 + 0.5 * Math.cos(Math.PI * st.s / 4), 2)} AU, speed ${F(1 / (1 + 0.5 * Math.cos(Math.PI * st.s / 4)), 2)} \u00d7 average`,
  });
  ctx.art.touchable(["sweep"]);
  return { destroy() {} };
}
