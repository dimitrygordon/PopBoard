// One filter: Rotate the polarizer in random (unpolarized) light of 100 units.
import { calc, f2 } from "../kit.js";
const F = f2, E = (x, d = 2) => x.toExponential(d).replace(/e\+?(-?)(\d+)/, (_, s, p) => " \u00d7 10^" + (s ? "\u2212" : "") + p).replace("-", "\u2212"), R = (a) => a[Math.floor(Math.random() * a.length)];
export default function build(ctx) {
  const k = calc(ctx, {
    st: {},
    sliders: [{ key: "a", label: "Filter angle", min: 0, max: 180, step: 5, value: 0, unit: "\\u00b0", d: 0 }],
    cuts: [
    { id: "rot", label: "One direction: tap to explain", tap: (st, c) => { return "A filter passes only one direction of oscillation: half the light, at any angle."; } }],
    show: (st) => "out: 50 units, polarized along the filter",
  });
  ctx.art.touchable(["rot"]);
  return { destroy() {} };
}
