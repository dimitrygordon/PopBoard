// Galvanometer: Send a known current.
import { calc, f2 } from "../kit.js";
const F = f2, E = (x, d = 2) => x.toExponential(d).replace(/e\+?(-?)(\d+)/, (_, s, p) => " \u00d7 10^" + (s ? "\u2212" : "") + p).replace("-", "\u2212"), R = (a) => a[Math.floor(Math.random() * a.length)];
export default function build(ctx) {
  const k = calc(ctx, {
    st: {},
    sliders: [{ key: "i", label: "I", min: 0, max: 100, step: 5, value: 50, unit: "\\u00b5A", d: 0 }],
    cuts: [
    { id: "try", label: "Needle: tap to explain", tap: (st, c) => { return "Twist is proportional to current."; } }],
    show: (st) => `needle turns ${F(st.i * 0.9, 0)}\u00b0 (full scale 90\u00b0 at 100 \u00b5A)`,
  });
  ctx.art.touchable(["try"]);
  return { destroy() {} };
}
