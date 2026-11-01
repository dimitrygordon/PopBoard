// Example Problem 7 part 2: on: 10.1 A, 15.2 V, lamp 110 V, 0.880 A.
import { calc, f2 } from "../kit.js";
const F = f2, E = (x, d = 2) => x.toExponential(d).replace(/e\+?(-?)(\d+)/, (_, s, p) => " \u00d7 10^" + (s ? "\u2212" : "") + p).replace("-", "\u2212"), R = (a) => a[Math.floor(Math.random() * a.length)];
export default function build(ctx) {
  const k = calc(ctx, {
    st: { d: 1 },
    sliders: [],
    cuts: [
    { id: "try", label: "Dryer: tap to toggle", tap: (st, c) => { st.d = 1 - st.d; return st.d ? "Book: I = 10.1 A, lamp 110 V, 0.880 A." : ""; } }],
    show: (st) => (() => { const R = st.d ? 1 / (1 / 125 + 1 / 12) : 125, I = 125 / (R + 1.5), V = 125 - I * 1.5; return `I = ${F(I, 1)} A\nlamp: ${F(V, 0)} V, ${F(V / 125, 3)} A`; })(),
  });
  ctx.art.touchable(["try"]);
  return { destroy() {} };
}
