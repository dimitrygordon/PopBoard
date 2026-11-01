// Grazing deflection = 4 G M / (c^2 R) = 1.75 arcseconds for the Sun (general relativity).
import { calc, f2 } from "../kit.js";
const F = f2, E = (x, d = 2) => x.toExponential(d).replace(/e\+?(-?)(\d+)/, (_, s, p) => " \u00d7 10^" + (s ? "\u2212" : "") + p).replace("-", "\u2212"), R = (a) => a[Math.floor(Math.random() * a.length)];
export default function build(ctx) {
  const k = calc(ctx, {
    st: {},
    sliders: [{ key: "M", label: "Sun mass", min: 0, max: 3, step: 0.1, value: 1, unit: "\\u00d7 Sun", d: 1 }],
    cuts: [
    { id: "bend", label: "Bend: tap to slide the star behind the Sun", tap: (st, c) => { return "The star looks shifted away from the Sun's edge."; } }],
    show: (st) => `bend = ${F(1.75 * st.M, 2)} arcseconds at the Sun's edge`,
  });
  ctx.art.touchable(["bend"]);
  return { destroy() {} };
}
