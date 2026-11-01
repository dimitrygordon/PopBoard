// 3D wave: Rotate the view.
import { calc, f2 } from "../kit.js";
const F = f2, E = (x, d = 2) => x.toExponential(d).replace(/e\+?(-?)(\d+)/, (_, s, p) => " \u00d7 10^" + (s ? "\u2212" : "") + p).replace("-", "\u2212"), R = (a) => a[Math.floor(Math.random() * a.length)];
export default function build(ctx) {
  const k = calc(ctx, {
    st: {},
    sliders: [{ key: "a", label: "View angle", min: 0, max: 360, step: 15, value: 30, unit: "\\u00b0", d: 0 }],
    cuts: [
    { id: "try", label: "Wave: tap to explain", tap: (st, c) => { return "E, B, and travel: all at right angles."; } }],
    show: (st) => "E \u22a5 B \u22a5 direction of travel, from every angle",
  });
  ctx.art.touchable(["try"]);
  return { destroy() {} };
}
