// Three blocks: Set the angle and tap to switch blocks.
import { calc, f2 } from "../kit.js";
const F = f2, E = (x, d = 2) => x.toExponential(d).replace(/e\+?(-?)(\d+)/, (_, s, p) => " \u00d7 10^" + (s ? "\u2212" : "") + p).replace("-", "\u2212"), R = (a) => a[Math.floor(Math.random() * a.length)];
export default function build(ctx) {
  const k = calc(ctx, {
    st: { i: 0, N: ["water", "glass", "diamond"], n: [1.33, 1.52, 2.42] },
    sliders: [{ key: "a", label: "Angle of incidence", min: 0, max: 80, step: 1, value: 45, unit: "\\u00b0", d: 0 }],
    cuts: [
    { id: "try", label: "Block: tap for the next one", tap: (st, c) => { st.i = (st.i + 1) % 3; return "Bigger n, more bending."; } }],
    show: (st) => `${st.N[st.i]} (n = ${st.n[st.i]}): \u03b8\u2082 = ${F(Math.asin(Math.sin(st.a * Math.PI / 180) / st.n[st.i]) * 180 / Math.PI, 1)}\u00b0`,
  });
  ctx.art.touchable(["try"]);
  return { destroy() {} };
}
