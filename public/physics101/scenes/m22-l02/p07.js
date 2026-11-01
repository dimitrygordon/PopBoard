// Uncertainty: Shrink the light's wavelength.
import { calc, f2 } from "../kit.js";
const F = f2, E = (x, d = 2) => x.toExponential(d).replace(/e\+?(-?)(\d+)/, (_, s, p) => " \u00d7 10^" + (s ? "\u2212" : "") + p).replace("-", "\u2212"), R = (a) => a[Math.floor(Math.random() * a.length)];
export default function build(ctx) {
  const k = calc(ctx, {
    st: {},
    sliders: [{ key: "l", label: "\\u03bb", min: 10, max: 1000, step: 10, value: 500, unit: "nm", d: 0 }],
    cuts: [
    { id: "try", label: "Electron: tap to explain", tap: (st, c) => { return "\u0394x\u0394p \u2265 h/4\u03c0."; } }],
    show: (st) => `position blur \u2248 ${st.l} nm\nmomentum kick \u2248 ${E(6.626e-34 / (st.l * 1e-9), 2)} kg\u00b7m/s`,
  });
  ctx.art.touchable(["try"]);
  return { destroy() {} };
}
