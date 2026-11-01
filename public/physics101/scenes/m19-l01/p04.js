// Waterwheel: Change the water flow on the waterwheel generator.
import { calc, f2 } from "../kit.js";
const F = f2, E = (x, d = 2) => x.toExponential(d).replace(/e\+?(-?)(\d+)/, (_, s, p) => " \u00d7 10^" + (s ? "\u2212" : "") + p).replace("-", "\u2212"), R = (a) => a[Math.floor(Math.random() * a.length)];
export default function build(ctx) {
  const k = calc(ctx, {
    st: {},
    sliders: [{ key: "f", label: "Water flow", min: 0, max: 10, step: 1, value: 5, unit: "L/s", d: 0 }],
    cuts: [
    { id: "try", label: "Bucket: tap to explain", tap: (st, c) => { return "More flow, more energy each second."; } }],
    show: (st) => `bucket rises ${F(st.f * 0.1, 1)} m/s\npower \u221d flow`,
  });
  ctx.art.touchable(["try"]);
  return { destroy() {} };
}
