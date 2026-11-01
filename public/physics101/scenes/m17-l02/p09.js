// Spectroscope: Rotate the telescope (grating d = 1.67 \u00b5m) to find the first-order line.
import { calc, f2 } from "../kit.js";
const F = f2, E = (x, d = 2) => x.toExponential(d).replace(/e\+?(-?)(\d+)/, (_, s, p) => " \u00d7 10^" + (s ? "\u2212" : "") + p).replace("-", "\u2212"), R = (a) => a[Math.floor(Math.random() * a.length)];
export default function build(ctx) {
  const k = calc(ctx, {
    st: {},
    sliders: [{ key: "a", label: "\\u03b8", min: 10, max: 30, step: 0.1, value: 20, unit: "\\u00b0", d: 1 }],
    cuts: [
    { id: "try", label: "Line: tap to read \\u03bb", tap: (st, c) => { return `\u03bb = d sin\u03b8 = ${F(1670 * Math.sin(st.a * Math.PI / 180), 0)} nm.`; } }],
    show: (st) => `\u03bb = d sin\u03b8 = ${F(1670 * Math.sin(st.a * Math.PI / 180), 0)} nm`,
  });
  ctx.art.touchable(["try"]);
  return { destroy() {} };
}
