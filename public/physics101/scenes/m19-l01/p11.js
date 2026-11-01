// Wire: Stretch and thicken a copper wire.
import { calc, f2 } from "../kit.js";
const F = f2, E = (x, d = 2) => x.toExponential(d).replace(/e\+?(-?)(\d+)/, (_, s, p) => " \u00d7 10^" + (s ? "\u2212" : "") + p).replace("-", "\u2212"), R = (a) => a[Math.floor(Math.random() * a.length)];
export default function build(ctx) {
  const k = calc(ctx, {
    st: {},
    sliders: [{ key: "l", label: "Length", min: 1, max: 10, step: 1, value: 1, unit: "m", d: 0 }, { key: "a", label: "Cross-section", min: 0.5, max: 5, step: 0.5, value: 1, unit: "mm\\u00b2", d: 1 }],
    cuts: [
    { id: "try", label: "Meter: tap to explain", tap: (st, c) => { return "Longer: more R. Thicker: less R. Hotter: usually more R."; } }],
    show: (st) => `R = \u03c1L/A = ${F(0.0172 * st.l / st.a, 4)} \u03a9`,
  });
  ctx.art.touchable(["try"]);
  return { destroy() {} };
}
