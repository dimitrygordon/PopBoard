// Example Problem 6: 1150 kg at 15.0, 1575 kg at 5.0: v_f = 9.2 m/s, KE lost 3.4e4 J.
import { calc, f2 } from "../kit.js";
const F = f2, E = (x, d = 2) => x.toExponential(d).replace(/e\+?(-?)(\d+)/, (_, s, p) => " \u00d7 10^" + (s ? "\u2212" : "") + p).replace("-", "\u2212"), R = (a) => a[Math.floor(Math.random() * a.length)];
export default function build(ctx) {
  const k = calc(ctx, {
    st: {},
    sliders: [{ key: "a", label: "Car A speed", min: 5, max: 30, step: 0.5, value: 15, unit: "m/s", d: 1 }, { key: "b", label: "Car B speed", min: 0, max: 15, step: 0.5, value: 5, unit: "m/s", d: 1 }],
    cuts: [
    { id: "ex6", label: "Ex6: tap for the book's speeds", tap: (st, c) => { st.a = 15; st.b = 5; c.a.set(15); c.b.set(5); return ""; } }],
    show: (st) => (() => { const v = (1150 * st.a + 1575 * st.b) / 2725, K1 = 575 * st.a ** 2 + 787.5 * st.b ** 2, K2 = 1362.5 * v * v; return `v_f = ${F(v, 1)} m/s\nKE lost = ${E(K1 - K2, 1)} J`; })(),
  });
  ctx.art.touchable(["ex6"]);
  return { destroy() {} };
}
