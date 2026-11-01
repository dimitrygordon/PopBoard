// Example Problem 3: 1875 kg at 23 m/s, 1025 kg at 17 m/s: v_f = 21 m/s.
import { calc, f2 } from "../kit.js";
const F = f2, E = (x, d = 2) => x.toExponential(d).replace(/e\+?(-?)(\d+)/, (_, s, p) => " \u00d7 10^" + (s ? "\u2212" : "") + p).replace("-", "\u2212"), R = (a) => a[Math.floor(Math.random() * a.length)];
export default function build(ctx) {
  const k = calc(ctx, {
    st: {},
    sliders: [{ key: "a", label: "Car C speed", min: 0, max: 30, step: 1, value: 23, unit: "m/s", d: 0 }, { key: "b", label: "Car D speed", min: 0, max: 30, step: 1, value: 17, unit: "m/s", d: 0 }],
    cuts: [
    { id: "ex3", label: "Ex3: tap for the book's speeds", tap: (st, c) => { st.a = 23; st.b = 17; c.a.set(23); c.b.set(17); return "v_f = 21 m/s."; } }],
    show: (st) => `v_f = (1875 \u00d7 ${st.a} + 1025 \u00d7 ${st.b}) / 2900\n= ${F((1875 * st.a + 1025 * st.b) / 2900, 1)} m/s`,
  });
  ctx.art.touchable(["ex3"]);
  return { destroy() {} };
}
