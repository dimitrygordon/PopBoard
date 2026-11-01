// Example Problem 1, part 2: 3.0 cm gives 90 N, net 1.3e2 N at 42 deg.
import { calc, f2 } from "../kit.js";
const F = f2, E = (x, d = 2) => x.toExponential(d).replace(/e\+?(-?)(\d+)/, (_, s, p) => " \u00d7 10^" + (s ? "\u2212" : "") + p).replace("-", "\u2212"), R = (a) => a[Math.floor(Math.random() * a.length)];
export default function build(ctx) {
  const k = calc(ctx, {
    st: {},
    sliders: [{ key: "r", label: "r_AC", min: 1, max: 10, step: 0.1, value: 3, unit: "cm", d: 1 }],
    cuts: [
    { id: "try", label: "Net force: tap for the book's 3.0 cm", tap: (st, c) => { st.r = 3; c.r.set(3); return "F_net = 1.3 \u00d7 10\u00b2 N, 42\u00b0 above +x."; } }],
    show: (st) => (() => { const fc = 9e9 * 9e-12 / (st.r / 100) ** 2; return `F_C on A = ${F(fc, 0)} N up\nF_net = ${F(Math.hypot(100, fc), 0)} N at ${F(Math.atan2(fc, 100) * 180 / Math.PI, 0)}\u00b0`; })(),
  });
  ctx.art.touchable(["try"]);
  return { destroy() {} };
}
