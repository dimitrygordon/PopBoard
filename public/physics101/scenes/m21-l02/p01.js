// Sliding wire: Drag the sliding wire across the loop.
import { calc, f2 } from "../kit.js";
const F = f2, E = (x, d = 2) => x.toExponential(d).replace(/e\+?(-?)(\d+)/, (_, s, p) => " \u00d7 10^" + (s ? "\u2212" : "") + p).replace("-", "\u2212"), R = (a) => a[Math.floor(Math.random() * a.length)];
export default function build(ctx) {
  const k = calc(ctx, {
    st: {},
    sliders: [{ key: "v", label: "v", min: 0, max: 5, step: 0.5, value: 2, unit: "m/s", d: 1 }],
    cuts: [
    { id: "try", label: "Loop: tap to explain", tap: (st, c) => { return "Pulling the wire induces a clockwise current."; } }],
    show: (st) => st.v ? `current flows clockwise, EMF = ${F(0.1 * st.v, 2)} V` : "not moving: no current",
  });
  ctx.art.touchable(["try"]);
  return { destroy() {} };
}
