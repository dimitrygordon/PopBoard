// Appliance: Set the current and voltage.
import { calc, f2 } from "../kit.js";
const F = f2, E = (x, d = 2) => x.toExponential(d).replace(/e\+?(-?)(\d+)/, (_, s, p) => " \u00d7 10^" + (s ? "\u2212" : "") + p).replace("-", "\u2212"), R = (a) => a[Math.floor(Math.random() * a.length)];
export default function build(ctx) {
  const k = calc(ctx, {
    st: {},
    sliders: [{ key: "i", label: "I", min: 0.1, max: 15, step: 0.1, value: 5, unit: "A", d: 1 }, { key: "v", label: "\\u0394V", min: 1, max: 240, step: 1, value: 120, unit: "V", d: 0 }],
    cuts: [
    { id: "try", label: "Power: tap to explain", tap: (st, c) => { return "P = I\u0394V."; } }],
    show: (st) => `P = ${F(st.i * st.v, 0)} W`,
  });
  ctx.art.touchable(["try"]);
  return { destroy() {} };
}
