// Loop walk: Walk a charge around a loop (12 V battery, 4.0 \u03a9 and 2.0 \u03a9).
import { calc, f2 } from "../kit.js";
const F = f2, E = (x, d = 2) => x.toExponential(d).replace(/e\+?(-?)(\d+)/, (_, s, p) => " \u00d7 10^" + (s ? "\u2212" : "") + p).replace("-", "\u2212"), R = (a) => a[Math.floor(Math.random() * a.length)];
export default function build(ctx) {
  const k = calc(ctx, {
    st: {},
    sliders: [{ key: "s", label: "Stop", min: 0, max: 3, step: 1, value: 0, unit: "", d: 0 }],
    cuts: [
    { id: "try", label: "Meter: tap to explain", tap: (st, c) => { return "Rises equal drops: back where it started."; } }],
    show: (st) => ["start: 0 V", "after the battery: +12 V", "after 4.0 \u03a9: +4.0 V", "after 2.0 \u03a9: 0 V"][st.s],
  });
  ctx.art.touchable(["try"]);
  return { destroy() {} };
}
