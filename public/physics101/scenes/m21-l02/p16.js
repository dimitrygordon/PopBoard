// Example Problem 2: V_s 1350 V; I_s 2.0 A: I_p 30 A.
import { calc, f2 } from "../kit.js";
const F = f2, E = (x, d = 2) => x.toExponential(d).replace(/e\+?(-?)(\d+)/, (_, s, p) => " \u00d7 10^" + (s ? "\u2212" : "") + p).replace("-", "\u2212"), R = (a) => a[Math.floor(Math.random() * a.length)];
export default function build(ctx) {
  const k = calc(ctx, {
    st: {},
    sliders: [{ key: "i", label: "I_s", min: 0.5, max: 5, step: 0.5, value: 2, unit: "A", d: 1 }],
    cuts: [
    { id: "try", label: "Meters: tap for the book's 2.0 A", tap: (st, c) => { st.i = 2; c.i.set(2); return "V_s = 1350 V, I_p = 30 A."; } }],
    show: (st) => `V_s = 1350 V\nI_p = ${F(1350 * st.i / 90, 0)} A`,
  });
  ctx.art.touchable(["try"]);
  return { destroy() {} };
}
