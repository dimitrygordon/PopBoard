// Beetle: Tune the spacing of the chitin layers (n = 1.56).
import { calc, f2 } from "../kit.js";
const F = f2, E = (x, d = 2) => x.toExponential(d).replace(/e\+?(-?)(\d+)/, (_, s, p) => " \u00d7 10^" + (s ? "\u2212" : "") + p).replace("-", "\u2212"), R = (a) => a[Math.floor(Math.random() * a.length)];
export default function build(ctx) {
  const k = calc(ctx, {
    st: {},
    sliders: [{ key: "d", label: "Layer spacing", min: 120, max: 230, step: 1, value: 170, unit: "nm", d: 0 }],
    cuts: [
    { id: "try", label: "Shell: tap to explain", tap: (st, c) => { return "Constructive interference at \u03bb = 2nd."; } }],
    show: (st) => (() => { const l = 2 * 1.56 * st.d; return `shine color: ${F(l, 0)} nm (${l < 495 ? "blue" : l < 570 ? "green" : "red"})`; })(),
  });
  ctx.art.touchable(["try"]);
  return { destroy() {} };
}
