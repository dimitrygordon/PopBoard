// Cathode rays: Raise the potential difference across the tube.
import { calc, f2 } from "../kit.js";
const F = f2, E = (x, d = 2) => x.toExponential(d).replace(/e\+?(-?)(\d+)/, (_, s, p) => " \u00d7 10^" + (s ? "\u2212" : "") + p).replace("-", "\u2212"), R = (a) => a[Math.floor(Math.random() * a.length)];
export default function build(ctx) {
  const k = calc(ctx, {
    st: {},
    sliders: [{ key: "v", label: "\\u0394V", min: 0, max: 5000, step: 100, value: 2000, unit: "V", d: 0 }],
    cuts: [
    { id: "try", label: "Screen: tap to explain", tap: (st, c) => { return "Faster electrons make a brighter spot."; } }],
    show: (st) => st.v < 500 ? "faint or no spot" : `spot brightness: ${F(Math.min(100, st.v / 50), 0)}%`,
  });
  ctx.art.touchable(["try"]);
  return { destroy() {} };
}
