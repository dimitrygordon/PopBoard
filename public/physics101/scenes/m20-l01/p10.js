// Compass and magnet: Move the compass toward the bar magnet.
import { calc, f2 } from "../kit.js";
const F = f2, E = (x, d = 2) => x.toExponential(d).replace(/e\+?(-?)(\d+)/, (_, s, p) => " \u00d7 10^" + (s ? "\u2212" : "") + p).replace("-", "\u2212"), R = (a) => a[Math.floor(Math.random() * a.length)];
export default function build(ctx) {
  const k = calc(ctx, {
    st: {},
    sliders: [{ key: "d", label: "Distance", min: 5, max: 100, step: 5, value: 60, unit: "cm", d: 0 }],
    cuts: [
    { id: "try", label: "Compass: tap to explain", tap: (st, c) => { return "The stronger field wins."; } }],
    show: (st) => st.d < 30 ? "the compass follows the magnet's field" : "the compass follows Earth's field",
  });
  ctx.art.touchable(["try"]);
  return { destroy() {} };
}
