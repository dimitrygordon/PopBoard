// Gap: Raise the temperature of silicon (gap 1.1 eV).
import { calc, f2 } from "../kit.js";
const F = f2, E = (x, d = 2) => x.toExponential(d).replace(/e\+?(-?)(\d+)/, (_, s, p) => " \u00d7 10^" + (s ? "\u2212" : "") + p).replace("-", "\u2212"), R = (a) => a[Math.floor(Math.random() * a.length)];
export default function build(ctx) {
  const k = calc(ctx, {
    st: {},
    sliders: [{ key: "t", label: "T", min: 200, max: 500, step: 10, value: 300, unit: "K", d: 0 }],
    cuts: [
    { id: "try", label: "Crystal: tap to explain", tap: (st, c) => { return "Warmer: more electrons hop the gap (simplified model)."; } }],
    show: (st) => `free electrons \u2248 ${E(1.45e10 * (st.t / 300) ** 1.5 * Math.exp(-1.12 / (2 * 8.617e-5) * (1 / st.t - 1 / 300)), 1)} per cm\u00b3`,
  });
  ctx.art.touchable(["try"]);
  return { destroy() {} };
}
