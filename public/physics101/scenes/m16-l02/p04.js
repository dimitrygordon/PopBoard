// Bulb: Slide the bulb along the axis of a concave mirror with f = 10 cm.
import { calc, f2 } from "../kit.js";
const F = f2, E = (x, d = 2) => x.toExponential(d).replace(/e\+?(-?)(\d+)/, (_, s, p) => " \u00d7 10^" + (s ? "\u2212" : "") + p).replace("-", "\u2212"), R = (a) => a[Math.floor(Math.random() * a.length)];
export default function build(ctx) {
  const k = calc(ctx, {
    st: {},
    sliders: [{ key: "x", label: "Bulb distance", min: 2, max: 30, step: 1, value: 15, unit: "cm", d: 0 }],
    cuts: [
    { id: "try", label: "Beam: tap to explain", tap: (st, c) => { return "A source at F makes a parallel beam, like a flashlight."; } }],
    show: (st) => st.x === 10 ? "bulb at F: perfectly parallel beam" : st.x < 10 ? "bulb inside F: beam spreads" : "bulb beyond F: beam converges",
  });
  ctx.art.touchable(["try"]);
  return { destroy() {} };
}
