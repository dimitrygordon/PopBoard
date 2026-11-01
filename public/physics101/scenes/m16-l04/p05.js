// Magnifier: Move the magnifier (f = 10 cm) over small text.
import { calc, f2 } from "../kit.js";
const F = f2, E = (x, d = 2) => x.toExponential(d).replace(/e\+?(-?)(\d+)/, (_, s, p) => " \u00d7 10^" + (s ? "\u2212" : "") + p).replace("-", "\u2212"), R = (a) => a[Math.floor(Math.random() * a.length)];
export default function build(ctx) {
  const k = calc(ctx, {
    st: {},
    sliders: [{ key: "x", label: "Distance to text", min: 2, max: 15, step: 0.5, value: 6, unit: "cm", d: 1 }],
    cuts: [
    { id: "try", label: "Text: tap to explain", tap: (st, c) => { return "Inside F: virtual, upright, enlarged."; } }],
    show: (st) => st.x < 10 ? `m = ${F(10 / (10 - st.x), 2)}, upright` : st.x === 10 ? "at F: no image" : "beyond F: upside down and blurry to your eye",
  });
  ctx.art.touchable(["try"]);
  return { destroy() {} };
}
