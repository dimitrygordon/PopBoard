// Compare: Tap to pick a mirror, then slide the object.
import { calc, f2 } from "../kit.js";
const F = f2, E = (x, d = 2) => x.toExponential(d).replace(/e\+?(-?)(\d+)/, (_, s, p) => " \u00d7 10^" + (s ? "\u2212" : "") + p).replace("-", "\u2212"), R = (a) => a[Math.floor(Math.random() * a.length)];
export default function build(ctx) {
  const k = calc(ctx, {
    st: { i: 0, N: ["plane", "concave (f = 10 cm)", "convex (f = \u221210 cm)"], f: [0, 10, -10] },
    sliders: [{ key: "x", label: "x_o", min: 2, max: 50, step: 1, value: 30, unit: "cm", d: 0 }],
    cuts: [
    { id: "try", label: "Mirror: tap to switch", tap: (st, c) => { st.i = (st.i + 1) % 3; return ""; } }],
    show: (st) => (() => { const f = st.f[st.i]; if (!f) return "plane: virtual, upright, same size"; if (st.x === f) return "at F: no image"; const xi = f * st.x / (st.x - f), m = -xi / st.x; return `${st.N[st.i]}: ${xi > 0 ? "real" : "virtual"}, ${m > 0 ? "upright" : "inverted"}, ${Math.abs(m) > 1 ? "enlarged" : "reduced"}`; })(),
  });
  ctx.art.touchable(["try"]);
  return { destroy() {} };
}
