// Paper clips: Slide the paper clips along the bar magnet.
import { calc, f2 } from "../kit.js";
const F = f2, E = (x, d = 2) => x.toExponential(d).replace(/e\+?(-?)(\d+)/, (_, s, p) => " \u00d7 10^" + (s ? "\u2212" : "") + p).replace("-", "\u2212"), R = (a) => a[Math.floor(Math.random() * a.length)];
export default function build(ctx) {
  const k = calc(ctx, {
    st: {},
    sliders: [{ key: "x", label: "Position along the magnet", min: 0, max: 10, step: 1, value: 0, unit: "cm", d: 0 }],
    cuts: [
    { id: "try", label: "Magnet: tap to explain", tap: (st, c) => { return "The poles, at the ends, attract most strongly."; } }],
    show: (st) => `clips held: ${Math.round(8 * Math.abs(st.x - 5) / 5)}`,
  });
  ctx.art.touchable(["try"]);
  return { destroy() {} };
}
