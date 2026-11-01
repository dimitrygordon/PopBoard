// Two blocks: Set the starting temperatures of two equal copper blocks, then tap them to touch.
import { calc, f2 } from "../kit.js";
const F = f2, E = (x, d = 2) => x.toExponential(d).replace(/e\+?(-?)(\d+)/, (_, s, p) => " \u00d7 10^" + (s ? "\u2212" : "") + p).replace("-", "\u2212"), R = (a) => a[Math.floor(Math.random() * a.length)];
export default function build(ctx) {
  const k = calc(ctx, {
    st: {},
    sliders: [{ key: "a", label: "Hot block", min: 40, max: 100, step: 1, value: 80, unit: "\\u00b0C", d: 0 }, { key: "b", label: "Cold block", min: 0, max: 40, step: 1, value: 20, unit: "\\u00b0C", d: 0 }],
    cuts: [
    { id: "eq", label: "Blocks: tap to let them touch", tap: (st, c) => { return `They settle at ${F((st.a + st.b) / 2, 1)} \u00b0C: thermal equilibrium.`; } }],
    show: (st) => `equal masses, same metal\nfinal temperature = ${F((st.a + st.b) / 2, 1)} \u00b0C`,
  });
  ctx.art.touchable(["eq"]);
  return { destroy() {} };
}
