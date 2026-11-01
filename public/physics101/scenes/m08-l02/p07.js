// Pencil 18 cm (sandbox), massless; coins 2.5 g each on each end. Balance point from the left: x = 18 nR / (nL + nR).
import { calc, f2 } from "../kit.js";
const F = f2, E = (x, d = 2) => x.toExponential(d).replace(/e\+?(-?)(\d+)/, (_, s, p) => " \u00d7 10^" + (s ? "\u2212" : "") + p).replace("-", "\u2212"), R = (a) => a[Math.floor(Math.random() * a.length)];
export default function build(ctx) {
  const k = calc(ctx, {
    st: {},
    sliders: [{ key: "L", label: "Coins on the left", min: 1, max: 5, step: 1, value: 1, unit: "", d: 0 }, { key: "R", label: "Coins on the right", min: 1, max: 5, step: 1, value: 2, unit: "", d: 0 }, { key: "x", label: "Pivot from the left end", min: 1, max: 17, step: 0.5, value: 9, unit: "cm", d: 1 }],
    cuts: [
    { id: "coins", label: "Coins: tap to slide the pivot to balance", tap: (st, c) => { st.x = 18 * st.R / (st.L + st.R); c.x.set(st.x); return "Balanced: the two torques are equal and opposite."; } }],
    show: (st) => (() => { const net = (st.R * (18 - st.x) - st.L * st.x) * 0.0025 * 9.8 / 100; return `net torque = ${F(net * 1000, 2)} mN\u00b7m ${Math.abs(net) < 1e-4 ? "(balanced)" : net > 0 ? "(tips right)" : "(tips left)"}`; })(),
  });
  ctx.art.touchable(["coins"]);
  return { destroy() {} };
}
