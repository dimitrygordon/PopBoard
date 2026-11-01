// Lever arm: Rotate the pull direction on the 0.25 m wrench. The dashed lever arm L = r sin\u03b8 shrinks as the pull lines up with the handle.
import { calc, f2 } from "../kit.js";
const F = f2, E = (x, d = 2) => x.toExponential(d).replace(/e\+?(-?)(\d+)/, (_, s, p) => " \u00d7 10^" + (s ? "\u2212" : "") + p).replace("-", "\u2212"), R = (a) => a[Math.floor(Math.random() * a.length)];
export default function build(ctx) {
  const k = calc(ctx, {
    st: {},
    sliders: [{ key: "a", label: "Pull angle", min: 0, max: 90, step: 5, value: 90, unit: "\\u00b0", d: 0 }],
    cuts: [
    { id: "pull", label: "Pull: tap to rotate the pull 30\\u00b0", tap: (st, c) => { st.a = st.a <= 0 ? 90 : st.a - 30; c.a.set(st.a); return st.a === 0 ? "Pulling along the handle: no lever arm, no torque." : ""; } }],
    show: (st) => `L = r sin\u03b8 = 0.25 \u00d7 sin ${st.a}\u00b0 = ${F(0.25 * Math.sin(st.a * Math.PI / 180), 3)} m`,
  });
  ctx.art.touchable(["pull"]);
  return { destroy() {} };
}
