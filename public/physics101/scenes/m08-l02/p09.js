// Example Problem 2: Kariann 56 kg, Aysha 43 kg; balance at r_A = 0.99 m, r_K = 0.76 m.
import { calc, f2 } from "../kit.js";
const F = f2, E = (x, d = 2) => x.toExponential(d).replace(/e\+?(-?)(\d+)/, (_, s, p) => " \u00d7 10^" + (s ? "\u2212" : "") + p).replace("-", "\u2212"), R = (a) => a[Math.floor(Math.random() * a.length)];
export default function build(ctx) {
  const k = calc(ctx, {
    st: {},
    sliders: [{ key: "a", label: "Aysha's distance r_A", min: 0.5, max: 1.5, step: 0.01, value: 0.8, unit: "m", d: 2 }],
    cuts: [
    { id: "ex2", label: "Ex2: tap to jump to the balance point", tap: (st, c) => { st.a = 0.99; c.a.set(0.99); return "r_A = 0.99 m and r_K = 0.76 m: the torques balance."; } }],
    show: (st) => (() => { const k = 56 * 9.8 * (1.75 - st.a), a = 43 * 9.8 * st.a; return `Kariann: ${F(k, 0)} N\u00b7m   Aysha: ${F(a, 0)} N\u00b7m\n${Math.abs(k - a) < 6 ? "balanced" : k > a ? "Kariann's side goes down" : "Aysha's side goes down"}`; })(),
  });
  ctx.art.touchable(["ex2"]);
  return { destroy() {} };
}
