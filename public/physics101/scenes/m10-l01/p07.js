// Area under F-d: Drag the displacement for a spring-like force F = 20d. The work is the shaded triangle.
import { calc, f2 } from "../kit.js";
const F = f2, E = (x, d = 2) => x.toExponential(d).replace(/e\+?(-?)(\d+)/, (_, s, p) => " \u00d7 10^" + (s ? "\u2212" : "") + p).replace("-", "\u2212"), R = (a) => a[Math.floor(Math.random() * a.length)];
export default function build(ctx) {
  const k = calc(ctx, {
    st: {},
    sliders: [{ key: "d", label: "Displacement", min: 0, max: 2, step: 0.1, value: 1, unit: "m", d: 1 }],
    cuts: [
    { id: "area", label: "Area: tap to double the displacement", tap: (st, c) => { st.d = st.d >= 2 ? 0.5 : st.d * 2; c.d.set(st.d); return "Twice the stretch: four times the area."; } }],
    show: (st) => `area = \u00bd \u00d7 ${F(st.d, 1)} m \u00d7 ${F(20 * st.d, 0)} N = ${F(10 * st.d * st.d, 1)} J`,
  });
  ctx.art.touchable(["area"]);
  return { destroy() {} };
}
