// Example Problem 1: 4.0 cm gives 1.0e2 N toward B.
import { calc, f2 } from "../kit.js";
const F = f2, E = (x, d = 2) => x.toExponential(d).replace(/e\+?(-?)(\d+)/, (_, s, p) => " \u00d7 10^" + (s ? "\u2212" : "") + p).replace("-", "\u2212"), R = (a) => a[Math.floor(Math.random() * a.length)];
export default function build(ctx) {
  const k = calc(ctx, {
    st: {},
    sliders: [{ key: "r", label: "r_AB", min: 1, max: 10, step: 0.1, value: 4, unit: "cm", d: 1 }],
    cuts: [
    { id: "try", label: "Spheres: tap for the book's 4.0 cm", tap: (st, c) => { st.r = 4; c.r.set(4); return "F_B on A = 1.0 \u00d7 10\u00b2 N, toward B."; } }],
    show: (st) => `F_B on A = ${E(9e9 * 18e-12 / (st.r / 100) ** 2, 1)} N, toward B (+x)`,
  });
  ctx.art.touchable(["try"]);
  return { destroy() {} };
}
