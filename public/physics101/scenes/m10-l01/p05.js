// Push at an angle: Change the angle of a 50 N push over 5.0 m.
import { calc, f2 } from "../kit.js";
const F = f2, E = (x, d = 2) => x.toExponential(d).replace(/e\+?(-?)(\d+)/, (_, s, p) => " \u00d7 10^" + (s ? "\u2212" : "") + p).replace("-", "\u2212"), R = (a) => a[Math.floor(Math.random() * a.length)];
export default function build(ctx) {
  const k = calc(ctx, {
    st: {},
    sliders: [{ key: "a", label: "Angle", min: 0, max: 90, step: 5, value: 30, unit: "\\u00b0", d: 0 }],
    cuts: [
    { id: "ang", label: "Ang: tap to push flat", tap: (st, c) => { st.a = 0; c.a.set(0); return "Pushing straight along the motion does the most work."; } }],
    show: (st) => `W = 50 \u00d7 5.0 \u00d7 cos ${st.a}\u00b0 = ${F(250 * Math.cos(st.a * Math.PI / 180), 0)} J`,
  });
  ctx.art.touchable(["ang"]);
  return { destroy() {} };
}
