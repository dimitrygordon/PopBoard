// Two waves: Slide one wave past the other.
import { calc, f2 } from "../kit.js";
const F = f2, E = (x, d = 2) => x.toExponential(d).replace(/e\+?(-?)(\d+)/, (_, s, p) => " \u00d7 10^" + (s ? "\u2212" : "") + p).replace("-", "\u2212"), R = (a) => a[Math.floor(Math.random() * a.length)];
export default function build(ctx) {
  const k = calc(ctx, {
    st: {},
    sliders: [{ key: "s", label: "Shift", min: 0, max: 1, step: 0.05, value: 0, unit: "wavelengths", d: 2 }],
    cuts: [
    { id: "try", label: "Waves: tap to explain", tap: (st, c) => { return "In phase they add; half a wave apart they cancel."; } }],
    show: (st) => `resulting amplitude = ${F(Math.abs(2 * Math.cos(Math.PI * st.s)), 2)} \u00d7 one wave`,
  });
  ctx.art.touchable(["try"]);
  return { destroy() {} };
}
