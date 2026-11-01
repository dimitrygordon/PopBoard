// Box 0.40 m wide, 0.80 m tall: CM over the corner at atan(0.20 / 0.40) = 26.6 deg.
import { calc, f2 } from "../kit.js";
const F = f2, E = (x, d = 2) => x.toExponential(d).replace(/e\+?(-?)(\d+)/, (_, s, p) => " \u00d7 10^" + (s ? "\u2212" : "") + p).replace("-", "\u2212"), R = (a) => a[Math.floor(Math.random() * a.length)];
export default function build(ctx) {
  const k = calc(ctx, {
    st: {},
    sliders: [{ key: "a", label: "Tilt", min: 0, max: 45, step: 1, value: 10, unit: "\\u00b0", d: 0 }],
    cuts: [
    { id: "tip", label: "Tip: tap to tilt 10\\u00b0 more", tap: (st, c) => { st.a = st.a >= 40 ? 0 : st.a + 10; c.a.set(st.a); return ""; } }],
    show: (st) => st.a < 26.6 ? `tilt ${st.a}\u00b0: the weight's torque turns it back (tips at 26.6\u00b0)` : `tilt ${st.a}\u00b0: CM is past the corner, it tips over`,
  });
  ctx.art.touchable(["tip"]);
  return { destroy() {} };
}
