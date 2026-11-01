// Synchrotron: Raise B as speed rises.
import { calc, f2 } from "../kit.js";
const F = f2, E = (x, d = 2) => x.toExponential(d).replace(/e\+?(-?)(\d+)/, (_, s, p) => " \u00d7 10^" + (s ? "\u2212" : "") + p).replace("-", "\u2212"), R = (a) => a[Math.floor(Math.random() * a.length)];
export default function build(ctx) {
  const k = calc(ctx, {
    st: {},
    sliders: [{ key: "b", label: "B", min: 0.1, max: 2, step: 0.05, value: 0.5, unit: "T", d: 2 }],
    cuts: [
    { id: "try", label: "Ring: tap to check", tap: (st, c) => { return Math.abs(st.b - 1) < 0.03 ? "On track!" : "Off the track."; } }],
    show: (st) => `beam ${st.b < 0.97 ? "drifts outward" : st.b > 1.03 ? "spirals inward" : "stays on track"} (needs 1.0 T now)`,
  });
  ctx.art.touchable(["try"]);
  return { destroy() {} };
}
