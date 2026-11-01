// Electron volts: Change the voltage.
import { calc, f2 } from "../kit.js";
const F = f2, E = (x, d = 2) => x.toExponential(d).replace(/e\+?(-?)(\d+)/, (_, s, p) => " \u00d7 10^" + (s ? "\u2212" : "") + p).replace("-", "\u2212"), R = (a) => a[Math.floor(Math.random() * a.length)];
export default function build(ctx) {
  const k = calc(ctx, {
    st: {},
    sliders: [{ key: "v", label: "\\u0394V", min: 1, max: 5, step: 1, value: 1, unit: "V", d: 0 }],
    cuts: [
    { id: "try", label: "Electron: tap to explain", tap: (st, c) => { return "1 eV = 1.60 \u00d7 10\u207b\u00b9\u2079 J."; } }],
    show: (st) => `${st.v} eV = ${E(st.v * 1.602e-19, 2)} J`,
  });
  ctx.art.touchable(["try"]);
  return { destroy() {} };
}
