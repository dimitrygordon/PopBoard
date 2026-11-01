// Orientation: Turn the loop.
import { calc, f2 } from "../kit.js";
const F = f2, E = (x, d = 2) => x.toExponential(d).replace(/e\+?(-?)(\d+)/, (_, s, p) => " \u00d7 10^" + (s ? "\u2212" : "") + p).replace("-", "\u2212"), R = (a) => a[Math.floor(Math.random() * a.length)];
export default function build(ctx) {
  const k = calc(ctx, {
    st: {},
    sliders: [{ key: "a", label: "Loop angle from vertical", min: 0, max: 360, step: 15, value: 0, unit: "\\u00b0", d: 0 }],
    cuts: [
    { id: "try", label: "Meter: tap to explain", tap: (st, c) => { return "Peak when horizontal, zero when vertical."; } }],
    show: (st) => `current = ${F(Math.sin(st.a * Math.PI / 180), 2)} \u00d7 peak`,
  });
  ctx.art.touchable(["try"]);
  return { destroy() {} };
}
