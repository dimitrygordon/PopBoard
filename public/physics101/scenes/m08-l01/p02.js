// Earth turns 2 pi rad in 24 h (book approximation). Seen from above the North Pole the turn is counterclockwise (positive).
import { calc, f2 } from "../kit.js";
const F = f2, E = (x, d = 2) => x.toExponential(d).replace(/e\+?(-?)(\d+)/, (_, s, p) => " \u00d7 10^" + (s ? "\u2212" : "") + p).replace("-", "\u2212"), R = (a) => a[Math.floor(Math.random() * a.length)];
export default function build(ctx) {
  const k = calc(ctx, {
    st: { s: false },
    sliders: [{ key: "h", label: "Hours", min: 0, max: 48, step: 1, value: 6, unit: "h", d: 0 }],
    cuts: [
    { id: "earth", label: "Earth: tap to flip the view", tap: (st, c) => { st.s = !st.s; return st.s ? "From the South Pole the same turn looks clockwise, so its sign flips." : "From the North Pole Earth turns counterclockwise."; } }],
    show: (st) => `\u0394\u03b8 = ${st.s ? "\u2212" : "+"}${F(2 * Math.PI * st.h / 24, 2)} rad (${st.h * 15}\u00b0) seen from the ${st.s ? "South" : "North"} Pole`,
  });
  ctx.art.touchable(["earth"]);
  return { destroy() {} };
}
