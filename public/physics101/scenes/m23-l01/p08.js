// Insulator: Raise the temperature (5 eV gap).
import { calc, f2 } from "../kit.js";
const F = f2, E = (x, d = 2) => x.toExponential(d).replace(/e\+?(-?)(\d+)/, (_, s, p) => " \u00d7 10^" + (s ? "\u2212" : "") + p).replace("-", "\u2212"), R = (a) => a[Math.floor(Math.random() * a.length)];
export default function build(ctx) {
  const k = calc(ctx, {
    st: {},
    sliders: [{ key: "t", label: "T", min: 300, max: 1000, step: 50, value: 300, unit: "K", d: 0 }],
    cuts: [
    { id: "try", label: "Gap: tap to explain", tap: (st, c) => { return "Almost no electrons can cross 5 eV."; } }],
    show: (st) => `fraction across \u2248 ${E(Math.exp(-5 / (2 * 8.617e-5 * st.t)), 1)}`,
  });
  ctx.art.touchable(["try"]);
  return { destroy() {} };
}
