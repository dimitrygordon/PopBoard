// Voltmeter: Move the far probe around a +1.0 nC charge (near probe at 0.10 m).
import { calc, f2 } from "../kit.js";
const F = f2, E = (x, d = 2) => x.toExponential(d).replace(/e\+?(-?)(\d+)/, (_, s, p) => " \u00d7 10^" + (s ? "\u2212" : "") + p).replace("-", "\u2212"), R = (a) => a[Math.floor(Math.random() * a.length)];
export default function build(ctx) {
  const k = calc(ctx, {
    st: {},
    sliders: [{ key: "r", label: "Far probe distance", min: 0.1, max: 1, step: 0.05, value: 0.5, unit: "m", d: 2 }],
    cuts: [
    { id: "try", label: "Voltmeter: tap to explain", tap: (st, c) => { return "A voltmeter reads only differences."; } }],
    show: (st) => `\u0394V = ${F(9 * (1 / 0.1 - 1 / st.r), 1)} V`,
  });
  ctx.art.touchable(["try"]);
  return { destroy() {} };
}
