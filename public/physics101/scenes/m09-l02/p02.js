// Momentum bars: Set the masses and speeds. In a sticky collision the total momentum before equals after.
import { calc, f2 } from "../kit.js";
const F = f2, E = (x, d = 2) => x.toExponential(d).replace(/e\+?(-?)(\d+)/, (_, s, p) => " \u00d7 10^" + (s ? "\u2212" : "") + p).replace("-", "\u2212"), R = (a) => a[Math.floor(Math.random() * a.length)];
export default function build(ctx) {
  const k = calc(ctx, {
    st: {},
    sliders: [{ key: "a", label: "Mass C", min: 0.5, max: 5, step: 0.5, value: 2, unit: "kg", d: 1 }, { key: "v", label: "Speed of C", min: 0, max: 5, step: 0.5, value: 3, unit: "m/s", d: 1 }, { key: "b", label: "Mass D", min: 0.5, max: 5, step: 0.5, value: 1, unit: "kg", d: 1 }],
    cuts: [
    { id: "cd", label: "Cd: tap to collide", tap: (st, c) => { return `They move off together at ${F((st.a * st.v) / (st.a + st.b), 2)} meters per second.`; } }],
    show: (st) => `before: ${F(st.a * st.v, 1)} + 0 = ${F(st.a * st.v, 1)} kg\u00b7m/s\nafter: ${F(st.a * st.v, 1)} kg\u00b7m/s at ${F((st.a * st.v) / (st.a + st.b), 2)} m/s`,
  });
  ctx.art.touchable(["cd"]);
  return { destroy() {} };
}
