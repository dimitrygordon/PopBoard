// Design: Tap to choose a mirror type, then slide a face toward it.
import { calc, f2 } from "../kit.js";
const F = f2, E = (x, d = 2) => x.toExponential(d).replace(/e\+?(-?)(\d+)/, (_, s, p) => " \u00d7 10^" + (s ? "\u2212" : "") + p).replace("-", "\u2212"), R = (a) => a[Math.floor(Math.random() * a.length)];
export default function build(ctx) {
  const k = calc(ctx, {
    st: { i: 0, N: ["plane", "concave (f = 10 cm)", "convex (f = \u221210 cm)"], f: [0, 10, -10] },
    sliders: [{ key: "x", label: "Face distance", min: 2, max: 40, step: 1, value: 5, unit: "cm", d: 0 }],
    cuts: [
    { id: "try", label: "Mirror type: tap to switch", tap: (st, c) => { st.i = (st.i + 1) % 3; return "Largest upright image: concave, face inside F."; } }],
    show: (st) => (() => { const f = st.f[st.i]; if (!f) return `${st.N[st.i]}: m = 1.00`; if (st.x === f) return "at F: no image"; const m = -f / (st.x - f); return `${st.N[st.i]}: m = ${F(m, 2)} ${m > 0 ? "upright" : "inverted"}`; })(),
  });
  ctx.art.touchable(["try"]);
  return { destroy() {} };
}
