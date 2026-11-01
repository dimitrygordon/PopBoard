// Example Problem 4: 10.2 eV.
import { calc, f2 } from "../kit.js";
const F = f2, E = (x, d = 2) => x.toExponential(d).replace(/e\+?(-?)(\d+)/, (_, s, p) => " \u00d7 10^" + (s ? "\u2212" : "") + p).replace("-", "\u2212"), R = (a) => a[Math.floor(Math.random() * a.length)];
export default function build(ctx) {
  const k = calc(ctx, {
    st: {},
    sliders: [{ key: "n", label: "Final n", min: 2, max: 5, step: 1, value: 2, unit: "", d: 0 }],
    cuts: [
    { id: "try", label: "Levels: tap for the book's n = 2", tap: (st, c) => { st.n = 2; c.n.set(2); return "E\u2082 \u2212 E\u2081 = 10.2 eV absorbed."; } }],
    show: (st) => `E\u2081 = \u221213.6 eV, E${st.n} = ${F(-13.6 / st.n ** 2, 2)} eV\nabsorbed: ${F(13.6 * (1 - 1 / st.n ** 2), 1)} eV`,
  });
  ctx.art.touchable(["try"]);
  return { destroy() {} };
}
