// Ellipse with semi-major axis a = 1.0 AU; foci at +/- c = e a. Perihelion a(1 - e), aphelion a(1 + e).
import { calc, f2 } from "../kit.js";
const F = f2, E = (x, d = 2) => x.toExponential(d).replace(/e\+?(-?)(\d+)/, (_, s, p) => " \u00d7 10^" + (s ? "\u2212" : "") + p).replace("-", "\u2212"), R = (a) => a[Math.floor(Math.random() * a.length)];
export default function build(ctx) {
  const k = calc(ctx, {
    st: {},
    sliders: [{ key: "e", label: "Foci apart (eccentricity)", min: 0, max: 0.9, step: 0.05, value: 0.3, unit: "", d: 2 }],
    cuts: [
    { id: "foci", label: "Ellipse: tap for a circle or a stretched orbit", tap: (st, c) => { st.e = st.e > 0 ? 0 : 0.8; c.e.set(st.e); return st.e ? "Foci far apart: a long, stretched ellipse." : "Both foci together: the ellipse is a circle."; } }],
    show: (st) => `foci ${F(2 * st.e, 2)} AU apart, Sun on one focus\nclosest ${F(1 - st.e, 2)} AU, farthest ${F(1 + st.e, 2)} AU`,
  });
  ctx.art.touchable(["foci"]);
  return { destroy() {} };
}
