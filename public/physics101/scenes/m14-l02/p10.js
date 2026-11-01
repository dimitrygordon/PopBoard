// Example Problem 2: 21.0 cm and 65.3 cm: lambda 0.886 m, v 347 m/s.
import { calc, f2 } from "../kit.js";
const F = f2, E = (x, d = 2) => x.toExponential(d).replace(/e\+?(-?)(\d+)/, (_, s, p) => " \u00d7 10^" + (s ? "\u2212" : "") + p).replace("-", "\u2212"), R = (a) => a[Math.floor(Math.random() * a.length)];
export default function build(ctx) {
  const k = calc(ctx, {
    st: {},
    sliders: [{ key: "t", label: "Room temperature", min: 0, max: 40, step: 1, value: 27, unit: "\\u00b0C", d: 0 }],
    cuts: [
    { id: "room", label: "Lengths: tap for the book's result", tap: (st, c) => { return "Book: 21.0 cm and 65.3 cm, \u03bb = 0.886 m, v = 347 m/s, a bit warmer than 20 \u00b0C."; } }],
    show: (st) => (() => { const v = 331 + 0.6 * st.t, l = v / 392; return `v = ${F(v, 0)} m/s, \u03bb = ${F(l, 3)} m\nlengths ${F(l * 25, 1)} cm, ${F(l * 75, 1)} cm (ideal pipe)`; })(),
  });
  ctx.art.touchable(["room"]);
  return { destroy() {} };
}
