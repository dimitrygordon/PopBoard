// Example Problem 2: h = 225 km gives r = 6.60e6 m, v = 7.77e3 m/s, T = 5.34e3 s.
import { calc, f2 } from "../kit.js";
const F = f2, E = (x, d = 2) => x.toExponential(d).replace(/e\+?(-?)(\d+)/, (_, s, p) => " \u00d7 10^" + (s ? "\u2212" : "") + p).replace("-", "\u2212"), R = (a) => a[Math.floor(Math.random() * a.length)];
export default function build(ctx) {
  const k = calc(ctx, {
    st: {},
    sliders: [{ key: "h", label: "Height", min: 100, max: 2000, step: 25, value: 225, unit: "km", d: 0 }],
    cuts: [
    { id: "h", label: "Walkthrough: tap for the formulas", tap: (st, c) => { return "v = \u221a(Gm_E / r) and T = 2\u03c0\u221a(r\u00b3 / Gm_E)."; } }],
    show: (st) => (() => { const r = 6.38e6 + st.h * 1e3, v = Math.sqrt(6.67e-11 * 5.97e24 / r); return `r = ${st.h} km + 6380 km = ${E(r)} m\nv = ${E(v)} m/s, T = ${E(2 * Math.PI * r / v)} s`; })(),
  });
  ctx.art.touchable(["h"]);
  return { destroy() {} };
}
