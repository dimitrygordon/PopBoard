// Wire antenna: Adjust the antenna length for 100 MHz.
import { calc, f2 } from "../kit.js";
const F = f2, E = (x, d = 2) => x.toExponential(d).replace(/e\+?(-?)(\d+)/, (_, s, p) => " \u00d7 10^" + (s ? "\u2212" : "") + p).replace("-", "\u2212"), R = (a) => a[Math.floor(Math.random() * a.length)];
export default function build(ctx) {
  const k = calc(ctx, {
    st: {},
    sliders: [{ key: "l", label: "Length", min: 0.5, max: 3, step: 0.05, value: 1.5, unit: "m", d: 2 }],
    cuts: [
    { id: "try", label: "Antenna: tap to check", tap: (st, c) => { return Math.abs(st.l - 1.5) < 0.03 ? "Half a wavelength: biggest signal." : "Not tuned."; } }],
    show: (st) => `\u03bb/2 = 1.50 m; signal ${F(100 * Math.exp(-(((st.l - 1.5) / 0.3) ** 2)), 0)}%`,
  });
  ctx.art.touchable(["try"]);
  return { destroy() {} };
}
