// 1240 eV\u00b7nm: Drag across the visible spectrum.
import { calc, f2 } from "../kit.js";
const F = f2, E = (x, d = 2) => x.toExponential(d).replace(/e\+?(-?)(\d+)/, (_, s, p) => " \u00d7 10^" + (s ? "\u2212" : "") + p).replace("-", "\u2212"), R = (a) => a[Math.floor(Math.random() * a.length)];
export default function build(ctx) {
  const k = calc(ctx, {
    st: {},
    sliders: [{ key: "l", label: "\\u03bb", min: 400, max: 700, step: 5, value: 550, unit: "nm", d: 0 }],
    cuts: [
    { id: "try", label: "Spectrum: tap to explain", tap: (st, c) => { return "E = 1240/\u03bb."; } }],
    show: (st) => `E = ${F(1240 / st.l, 2)} eV`,
  });
  ctx.art.touchable(["try"]);
  return { destroy() {} };
}
