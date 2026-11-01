// Sun spot: Slide the card along the axis of a mirror with r = 40 cm.
import { calc, f2 } from "../kit.js";
const F = f2, E = (x, d = 2) => x.toExponential(d).replace(/e\+?(-?)(\d+)/, (_, s, p) => " \u00d7 10^" + (s ? "\u2212" : "") + p).replace("-", "\u2212"), R = (a) => a[Math.floor(Math.random() * a.length)];
export default function build(ctx) {
  const k = calc(ctx, {
    st: {},
    sliders: [{ key: "x", label: "Card distance", min: 5, max: 40, step: 1, value: 15, unit: "cm", d: 0 }],
    cuts: [
    { id: "try", label: "Card: tap to check", tap: (st, c) => { return st.x === 20 ? "Smallest spot: f = r/2 = 20 cm." : "Not sharpest yet."; } }],
    show: (st) => `spot size \u2248 ${F(Math.abs(st.x - 20) * 0.3, 1)} cm`,
  });
  ctx.art.touchable(["try"]);
  return { destroy() {} };
}
