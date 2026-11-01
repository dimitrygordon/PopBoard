// Example Problem 5: 10.2 eV, 122 nm.
import { calc, f2 } from "../kit.js";
const F = f2, E = (x, d = 2) => x.toExponential(d).replace(/e\+?(-?)(\d+)/, (_, s, p) => " \u00d7 10^" + (s ? "\u2212" : "") + p).replace("-", "\u2212"), R = (a) => a[Math.floor(Math.random() * a.length)];
export default function build(ctx) {
  const k = calc(ctx, {
    st: {},
    sliders: [{ key: "n", label: "From n", min: 2, max: 5, step: 1, value: 2, unit: "", d: 0 }],
    cuts: [
    { id: "try", label: "Spectrum: tap for the book's n = 2", tap: (st, c) => { st.n = 2; c.n.set(2); return "10.2 eV, \u03bb = 122 nm, ultraviolet."; } }],
    show: (st) => (() => { const e = 13.6 * (1 - 1 / st.n ** 2); return `E = ${F(e, 1)} eV, \u03bb = ${F(1240 / e, 0)} nm`; })(),
  });
  ctx.art.touchable(["try"]);
  return { destroy() {} };
}
