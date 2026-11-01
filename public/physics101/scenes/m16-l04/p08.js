// Summary: Slide the object and tap to switch lens types (|f| = 10 cm).
import { calc, f2 } from "../kit.js";
const F = f2, E = (x, d = 2) => x.toExponential(d).replace(/e\+?(-?)(\d+)/, (_, s, p) => " \u00d7 10^" + (s ? "\u2212" : "") + p).replace("-", "\u2212"), R = (a) => a[Math.floor(Math.random() * a.length)];
export default function build(ctx) {
  const k = calc(ctx, {
    st: { i: 0 },
    sliders: [{ key: "x", label: "x_o", min: 2, max: 50, step: 1, value: 30, unit: "cm", d: 0 }],
    cuts: [
    { id: "try", label: "Lens: tap to switch", tap: (st, c) => { st.i = 1 - st.i; return ""; } }],
    show: (st) => (() => { const f = st.i ? -10 : 10; if (st.x === f) return "at F: no image"; const xi = f * st.x / (st.x - f), m = -xi / st.x; return `${st.i ? "concave" : "convex"}: m = ${F(m, 2)}, ${xi > 0 ? "real" : "virtual"}, ${m > 0 ? "upright" : "inverted"}`; })(),
  });
  ctx.art.touchable(["try"]);
  return { destroy() {} };
}
