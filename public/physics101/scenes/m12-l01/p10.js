// Example Problem 2: 120 K, 145 kPa gives 6.1 L; n = 0.893 mol; 35.6 g.
import { calc, f2 } from "../kit.js";
const F = f2, E = (x, d = 2) => x.toExponential(d).replace(/e\+?(-?)(\d+)/, (_, s, p) => " \u00d7 10^" + (s ? "\u2212" : "") + p).replace("-", "\u2212"), R = (a) => a[Math.floor(Math.random() * a.length)];
export default function build(ctx) {
  const k = calc(ctx, {
    st: {},
    sliders: [{ key: "t", label: "Final temperature", min: 50, max: 400, step: 1, value: 120, unit: "K", d: 0 }, { key: "p", label: "Final pressure", min: 50, max: 300, step: 1, value: 145, unit: "kPa", d: 0 }],
    cuts: [
    { id: "ex2", label: "New volume: tap for the book's values", tap: (st, c) => { st.t = 120; st.p = 145; c.t.set(120); c.p.set(145); return "V\u2082 = 6.1 L. Moles 0.893, mass 35.6 g."; } }],
    show: (st) => `V\u2082 = P\u2081V\u2081T\u2082 / (P\u2082T\u2081) = ${F(101.3 * 20 * st.t / (st.p * 273), 1)} L\nn = 0.893 mol, m = 35.6 g`,
  });
  ctx.art.touchable(["ex2"]);
  return { destroy() {} };
}
