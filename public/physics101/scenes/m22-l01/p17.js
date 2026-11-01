// Stopping potential: Turn the potentiometer.
import { calc, f2 } from "../kit.js";
const F = f2, E = (x, d = 2) => x.toExponential(d).replace(/e\+?(-?)(\d+)/, (_, s, p) => " \u00d7 10^" + (s ? "\u2212" : "") + p).replace("-", "\u2212"), R = (a) => a[Math.floor(Math.random() * a.length)];
export default function build(ctx) {
  const k = calc(ctx, {
    st: {},
    sliders: [{ key: "v", label: "Anode potential", min: 0, max: 3, step: 0.1, value: 0.5, unit: "V", d: 1 }],
    cuts: [
    { id: "try", label: "Ammeter: tap to explain", tap: (st, c) => { return "At V\u2080, KE_max = eV\u2080."; } }],
    show: (st) => st.v >= 1.5 ? "current = 0: stopping potential 1.5 V" : `current ${F(100 * (1 - st.v / 1.5), 0)}%`,
  });
  ctx.art.touchable(["try"]);
  return { destroy() {} };
}
