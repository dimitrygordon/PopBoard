// F = G m1 m2 / r^2 on each sphere (sandbox: kg and m).
import { calc, f2 } from "../kit.js";
const F = f2, E = (x, d = 2) => x.toExponential(d).replace(/e\+?(-?)(\d+)/, (_, s, p) => " \u00d7 10^" + (s ? "\u2212" : "") + p).replace("-", "\u2212"), R = (a) => a[Math.floor(Math.random() * a.length)];
export default function build(ctx) {
  const k = calc(ctx, {
    st: {},
    sliders: [{ key: "a", label: "Mass 1", min: 1, max: 100, step: 1, value: 10, unit: "kg", d: 0 }, { key: "b", label: "Mass 2", min: 1, max: 100, step: 1, value: 50, unit: "kg", d: 0 }, { key: "r", label: "Gap", min: 0.5, max: 5, step: 0.1, value: 1, unit: "m", d: 1 }],
    cuts: [
    { id: "mr", label: "Spheres: tap to double the gap", tap: (st, c) => { st.r = Math.min(5, st.r * 2); c.r.set(st.r); return "Twice the distance: one quarter the force, still equal on both."; } }],
    show: (st) => `F on 1 = F on 2 = ${E(6.67e-11 * st.a * st.b / st.r ** 2)} N\nequal size, opposite directions`,
  });
  ctx.art.touchable(["mr"]);
  return { destroy() {} };
}
