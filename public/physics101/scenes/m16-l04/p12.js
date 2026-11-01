// Eye: Move the object closer and adjust the lens to keep the image on the retina (2.0 cm away).
import { calc, f2 } from "../kit.js";
const F = f2, E = (x, d = 2) => x.toExponential(d).replace(/e\+?(-?)(\d+)/, (_, s, p) => " \u00d7 10^" + (s ? "\u2212" : "") + p).replace("-", "\u2212"), R = (a) => a[Math.floor(Math.random() * a.length)];
export default function build(ctx) {
  const k = calc(ctx, {
    st: {},
    sliders: [{ key: "x", label: "Object distance", min: 10, max: 200, step: 5, value: 50, unit: "cm", d: 0 }],
    cuts: [
    { id: "try", label: "Eye: tap to explain", tap: (st, c) => { return "Accommodation: the lens thickens for near objects."; } }],
    show: (st) => `needed f = ${F(1 / (1 / st.x + 1 / 2), 2)} cm`,
  });
  ctx.art.touchable(["try"]);
  return { destroy() {} };
}
