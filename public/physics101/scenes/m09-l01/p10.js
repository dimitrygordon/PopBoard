// Spin grows with the tangential part of the hit: sin(angle).
import { calc, f2 } from "../kit.js";
const F = f2, E = (x, d = 2) => x.toExponential(d).replace(/e\+?(-?)(\d+)/, (_, s, p) => " \u00d7 10^" + (s ? "\u2212" : "") + p).replace("-", "\u2212"), R = (a) => a[Math.floor(Math.random() * a.length)];
export default function build(ctx) {
  const k = calc(ctx, {
    st: {},
    sliders: [{ key: "a", label: "Paddle angle", min: 0, max: 60, step: 5, value: 30, unit: "\\u00b0", d: 0 }],
    cuts: [
    { id: "spin", label: "Spin: tap to hit", tap: (st, c) => { return st.a > 30 ? "A glancing hit: lots of spin and a curving path." : st.a ? "Some spin." : "Straight on: no spin."; } }],
    show: (st) => `spin ${F(150 * Math.sin(st.a * Math.PI / 180), 0)} rev/s (sandbox scale)`,
  });
  ctx.art.touchable(["spin"]);
  return { destroy() {} };
}
