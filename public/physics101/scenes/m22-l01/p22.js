// Example Problem 2: W 2.36 eV, 348 nm gives 1.20 eV.
import { calc, f2 } from "../kit.js";
const F = f2, E = (x, d = 2) => x.toExponential(d).replace(/e\+?(-?)(\d+)/, (_, s, p) => " \u00d7 10^" + (s ? "\u2212" : "") + p).replace("-", "\u2212"), R = (a) => a[Math.floor(Math.random() * a.length)];
export default function build(ctx) {
  const k = calc(ctx, {
    st: {},
    sliders: [{ key: "l", label: "\\u03bb", min: 250, max: 600, step: 1, value: 348, unit: "nm", d: 0 }],
    cuts: [
    { id: "try", label: "Result: tap for the book's 348 nm", tap: (st, c) => { st.l = 348; c.l.set(348); return "W = 2.36 eV; E = 3.56 eV; KE = 1.20 eV."; } }],
    show: (st) => (() => { const e = 1240 / st.l; return `E = ${F(e, 2)} eV; W = 2.36 eV\n` + (e > 2.36 ? `KE = ${F(e - 2.36, 2)} eV` : "no electrons"); })(),
  });
  ctx.art.touchable(["try"]);
  return { destroy() {} };
}
