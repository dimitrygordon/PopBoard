// Pump: Choose the pump wavelength (laser emits at 694 nm).
import { calc, f2 } from "../kit.js";
const F = f2, E = (x, d = 2) => x.toExponential(d).replace(/e\+?(-?)(\d+)/, (_, s, p) => " \u00d7 10^" + (s ? "\u2212" : "") + p).replace("-", "\u2212"), R = (a) => a[Math.floor(Math.random() * a.length)];
export default function build(ctx) {
  const k = calc(ctx, {
    st: {},
    sliders: [{ key: "l", label: "Pump \\u03bb", min: 400, max: 900, step: 10, value: 550, unit: "nm", d: 0 }],
    cuts: [
    { id: "try", label: "Laser: tap to explain", tap: (st, c) => { return "Pump photons need more energy than the laser photon."; } }],
    show: (st) => st.l < 694 ? "works" : "doesn't pump",
  });
  ctx.art.touchable(["try"]);
  return { destroy() {} };
}
