// Example Problem 7: 4.00 cm gear: IMA 0.112, MA 0.107, F_r 16.5 N, d_e 1.57 cm.
import { calc, f2 } from "../kit.js";
const F = f2, E = (x, d = 2) => x.toExponential(d).replace(/e\+?(-?)(\d+)/, (_, s, p) => " \u00d7 10^" + (s ? "\u2212" : "") + p).replace("-", "\u2212"), R = (a) => a[Math.floor(Math.random() * a.length)];
export default function build(ctx) {
  const k = calc(ctx, {
    st: {},
    sliders: [{ key: "r", label: "Gear radius", min: 2, max: 8, step: 0.25, value: 4, unit: "cm", d: 2 }],
    cuts: [
    { id: "ex7", label: "Ex7: tap for the book's 4.00 cm", tap: (st, c) => { st.r = 4; c.r.set(4); return ""; } }],
    show: (st) => (() => { const I = st.r / 35.6, M = 0.95 * I; return `IMA = ${F(I, 3)}, MA = ${F(M, 3)}\nF_r = ${F(M * 155, 1)} N, d_e = ${F(14 * I, 2)} cm`; })(),
  });
  ctx.art.touchable(["ex7"]);
  return { destroy() {} };
}
