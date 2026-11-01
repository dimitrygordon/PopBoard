// Tilt the force: Tilt the force on the moving cart. Only the part along the motion changes its speed.
import { calc, f2 } from "../kit.js";
const F = f2, E = (x, d = 2) => x.toExponential(d).replace(/e\+?(-?)(\d+)/, (_, s, p) => " \u00d7 10^" + (s ? "\u2212" : "") + p).replace("-", "\u2212"), R = (a) => a[Math.floor(Math.random() * a.length)];
export default function build(ctx) {
  const k = calc(ctx, {
    st: {},
    sliders: [{ key: "a", label: "Angle to the motion", min: 0, max: 180, step: 10, value: 0, unit: "\\u00b0", d: 0 }],
    cuts: [
    { id: "orbit", label: "Orbit: tap to point the force sideways", tap: (st, c) => { st.a = 90; c.a.set(90); return "Force at 90\u00b0: no work, the speed does not change (like a circular orbit)."; } }],
    show: (st) => `W = Fd cos\u03b8 \u221d ${F(Math.cos(st.a * Math.PI / 180), 2)}: speed ${Math.abs(st.a - 90) < 1 ? "unchanged" : st.a < 90 ? "increases" : "decreases"}`,
  });
  ctx.art.touchable(["orbit"]);
  return { destroy() {} };
}
