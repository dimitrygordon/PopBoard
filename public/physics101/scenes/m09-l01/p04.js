// Two frames: Tap to switch between the roadside frame and the driver's frame for a 1200 kg car at 25 m/s.
import { calc, f2 } from "../kit.js";
const F = f2, E = (x, d = 2) => x.toExponential(d).replace(/e\+?(-?)(\d+)/, (_, s, p) => " \u00d7 10^" + (s ? "\u2212" : "") + p).replace("-", "\u2212"), R = (a) => a[Math.floor(Math.random() * a.length)];
export default function build(ctx) {
  const k = calc(ctx, {
    st: { d: false },
    sliders: [],
    cuts: [
    { id: "frame", label: "Frame: tap to switch frames", tap: (st, c) => { st.d = !st.d; return st.d ? "From the driver's seat the car is at rest: zero momentum." : ""; } }],
    show: (st) => st.d ? "driver's frame: v = 0 m/s, p = 0 kg\u00b7m/s" : "roadside frame: v = 25 m/s, p = mv = 3.0 \u00d7 10^4 kg\u00b7m/s",
  });
  ctx.art.touchable(["frame"]);
  return { destroy() {} };
}
