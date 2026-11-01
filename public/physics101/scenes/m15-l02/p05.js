// Wavelength: Slide a wavelength.
import { calc, f2 } from "../kit.js";
const F = f2, E = (x, d = 2) => x.toExponential(d).replace(/e\+?(-?)(\d+)/, (_, s, p) => " \u00d7 10^" + (s ? "\u2212" : "") + p).replace("-", "\u2212"), R = (a) => a[Math.floor(Math.random() * a.length)];
export default function build(ctx) {
  const k = calc(ctx, {
    st: {},
    sliders: [{ key: "l", label: "Wavelength", min: 400, max: 700, step: 5, value: 550, unit: "nm", d: 0 }],
    cuts: [
    { id: "sl", label: "Color: tap to name it", tap: (st, c) => { return ""; } }],
    show: (st) => `${st.l} nm: ${st.l < 450 ? "violet" : st.l < 495 ? "blue" : st.l < 570 ? "green" : st.l < 590 ? "yellow" : st.l < 620 ? "orange" : "red"}`,
  });
  ctx.art.touchable(["sl"]);
  return { destroy() {} };
}
