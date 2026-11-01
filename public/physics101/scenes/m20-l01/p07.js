// Domains: Bring the strong magnet closer.
import { calc, f2 } from "../kit.js";
const F = f2, E = (x, d = 2) => x.toExponential(d).replace(/e\+?(-?)(\d+)/, (_, s, p) => " \u00d7 10^" + (s ? "\u2212" : "") + p).replace("-", "\u2212"), R = (a) => a[Math.floor(Math.random() * a.length)];
export default function build(ctx) {
  const k = calc(ctx, {
    st: {},
    sliders: [{ key: "d", label: "Distance", min: 1, max: 20, step: 1, value: 20, unit: "cm", d: 0 }],
    cuts: [
    { id: "try", label: "Domains: tap to remove the magnet", tap: (st, c) => { return "Without the magnet, the domains drift back toward random."; } }],
    show: (st) => `${F(Math.min(100, 2000 / st.d ** 2 + 10), 0)}% of domains aligned`,
  });
  ctx.art.touchable(["try"]);
  return { destroy() {} };
}
