// Example Problem 4: 30.0 deg gives 19.2 deg.
import { calc, f2 } from "../kit.js";
const F = f2, E = (x, d = 2) => x.toExponential(d).replace(/e\+?(-?)(\d+)/, (_, s, p) => " \u00d7 10^" + (s ? "\u2212" : "") + p).replace("-", "\u2212"), R = (a) => a[Math.floor(Math.random() * a.length)];
export default function build(ctx) {
  const k = calc(ctx, {
    st: { i: 0, N: ["float glass", "water", "diamond"], n: [1.52, 1.33, 2.42] },
    sliders: [{ key: "a", label: "\\u03b8\\u2081", min: 0, max: 85, step: 0.5, value: 30, unit: "\\u00b0", d: 1 }],
    cuts: [
    { id: "try", label: "Medium: tap to switch", tap: (st, c) => { st.i = (st.i + 1) % 3; return st.i ? "" : "Book: 30.0\u00b0 onto float glass gives 19.2\u00b0."; } }],
    show: (st) => `${st.N[st.i]}: \u03b8\u2082 = sin\u207b\u00b9(sin ${F(st.a, 1)}\u00b0 / ${st.n[st.i]}) = ${F(Math.asin(Math.sin(st.a * Math.PI / 180) / st.n[st.i]) * 180 / Math.PI, 1)}\u00b0`,
  });
  ctx.art.touchable(["try"]);
  return { destroy() {} };
}
