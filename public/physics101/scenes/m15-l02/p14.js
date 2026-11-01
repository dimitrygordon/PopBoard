// Galaxy: Slide the galaxy's 656.3 nm line until it matches the observed spectrum.
import { calc, f2 } from "../kit.js";
const F = f2, E = (x, d = 2) => x.toExponential(d).replace(/e\+?(-?)(\d+)/, (_, s, p) => " \u00d7 10^" + (s ? "\u2212" : "") + p).replace("-", "\u2212"), R = (a) => a[Math.floor(Math.random() * a.length)];
export default function build(ctx) {
  const k = calc(ctx, {
    st: {},
    sliders: [{ key: "l", label: "Observed wavelength", min: 656.3, max: 700, step: 0.1, value: 670, unit: "nm", d: 1 }],
    cuts: [
    { id: "sp", label: "Recession speed: tap to explain", tap: (st, c) => { return "v = c\u0394\u03bb/\u03bb for small speeds."; } }],
    show: (st) => `\u0394\u03bb = ${F(st.l - 656.3, 1)} nm\nv \u2248 ${F(3e5 * (st.l - 656.3) / 656.3, 0)} km/s away`,
  });
  ctx.art.touchable(["sp"]);
  return { destroy() {} };
}
