// Each skater gets an impulse of 100 N s, opposite directions (sandbox).
import { calc, f2 } from "../kit.js";
const F = f2, E = (x, d = 2) => x.toExponential(d).replace(/e\+?(-?)(\d+)/, (_, s, p) => " \u00d7 10^" + (s ? "\u2212" : "") + p).replace("-", "\u2212"), R = (a) => a[Math.floor(Math.random() * a.length)];
export default function build(ctx) {
  const k = calc(ctx, {
    st: {},
    sliders: [{ key: "a", label: "Skater A", min: 30, max: 90, step: 5, value: 50, unit: "kg", d: 0 }, { key: "b", label: "Skater B", min: 30, max: 90, step: 5, value: 70, unit: "kg", d: 0 }],
    cuts: [
    { id: "push", label: "Push: tap to push apart", tap: (st, c) => { return "The lighter skater rolls away faster."; } }],
    show: (st) => `A: \u2212${F(100 / st.a, 2)} m/s   B: +${F(100 / st.b, 2)} m/s\np_A + p_B = \u2212100 + 100 = 0`,
  });
  ctx.art.touchable(["push"]);
  return { destroy() {} };
}
