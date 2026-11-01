// Windowpane: Change the glass thickness (ray at 45\u00b0, n = 1.52).
import { calc, f2 } from "../kit.js";
const F = f2, E = (x, d = 2) => x.toExponential(d).replace(/e\+?(-?)(\d+)/, (_, s, p) => " \u00d7 10^" + (s ? "\u2212" : "") + p).replace("-", "\u2212"), R = (a) => a[Math.floor(Math.random() * a.length)];
export default function build(ctx) {
  const k = calc(ctx, {
    st: {},
    sliders: [{ key: "t", label: "Thickness", min: 1, max: 20, step: 1, value: 5, unit: "mm", d: 0 }],
    cuts: [
    { id: "try", label: "Exit ray: tap to explain", tap: (st, c) => { return "In, bend toward the normal; out, bend back. The exit ray stays parallel."; } }],
    show: (st) => (() => { const a = Math.PI / 4, b = Math.asin(Math.sin(a) / 1.52); return `exit ray parallel to the incoming ray\nsideways shift = ${F(st.t * Math.sin(a - b) / Math.cos(b), 2)} mm`; })(),
  });
  ctx.art.touchable(["try"]);
  return { destroy() {} };
}
