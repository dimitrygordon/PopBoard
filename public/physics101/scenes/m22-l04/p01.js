// Wave orbit: Change the wave count around the orbit.
import { calc, f2 } from "../kit.js";
const F = f2, E = (x, d = 2) => x.toExponential(d).replace(/e\+?(-?)(\d+)/, (_, s, p) => " \u00d7 10^" + (s ? "\u2212" : "") + p).replace("-", "\u2212"), R = (a) => a[Math.floor(Math.random() * a.length)];
export default function build(ctx) {
  const k = calc(ctx, {
    st: {},
    sliders: [{ key: "n", label: "Wavelengths", min: 1, max: 5, step: 0.25, value: 2, unit: "", d: 2 }],
    cuts: [
    { id: "try", label: "Orbit: tap to explain", tap: (st, c) => { return "Only whole numbers close smoothly."; } }],
    show: (st) => Number.isInteger(st.n) ? "closes smoothly: allowed" : "doesn't close: not allowed",
  });
  ctx.art.touchable(["try"]);
  return { destroy() {} };
}
