// Example Problem 3: oxygen-17.
import { calc, f2 } from "../kit.js";
const F = f2, E = (x, d = 2) => x.toExponential(d).replace(/e\+?(-?)(\d+)/, (_, s, p) => " \u00d7 10^" + (s ? "\u2212" : "") + p).replace("-", "\u2212"), R = (a) => a[Math.floor(Math.random() * a.length)];
export default function build(ctx) {
  const k = calc(ctx, {
    st: {},
    sliders: [{ key: "z", label: "Leftover Z", min: 6, max: 9, step: 1, value: 8, unit: "", d: 0 }],
    cuts: [
    { id: "try", label: "Result: tap for the book's answer", tap: (st, c) => { st.z = 8; c.z.set(8); return "Z = 8, A = 17: oxygen-17."; } }],
    show: (st) => st.z === 8 ? "He-4 + N-14 \u2192 H-1 + O-17 \u2713" : "\u2717 not balanced",
  });
  ctx.art.touchable(["try"]);
  return { destroy() {} };
}
