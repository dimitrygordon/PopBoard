// Pendulum analogy: Slide through one cycle.
import { calc, f2 } from "../kit.js";
const F = f2, E = (x, d = 2) => x.toExponential(d).replace(/e\+?(-?)(\d+)/, (_, s, p) => " \u00d7 10^" + (s ? "\u2212" : "") + p).replace("-", "\u2212"), R = (a) => a[Math.floor(Math.random() * a.length)];
export default function build(ctx) {
  const k = calc(ctx, {
    st: {},
    sliders: [{ key: "s", label: "Moment", min: 0, max: 3, step: 1, value: 0, unit: "", d: 0 }],
    cuts: [
    { id: "try", label: "Bars: tap to explain", tap: (st, c) => { return "Capacitor energy is like PE; coil energy is like KE."; } }],
    show: (st) => ["capacitor full / pendulum at top", "current max / pendulum at bottom", "capacitor full, reversed / other top", "current max, reversed / bottom again"][st.s],
  });
  ctx.art.touchable(["try"]);
  return { destroy() {} };
}
