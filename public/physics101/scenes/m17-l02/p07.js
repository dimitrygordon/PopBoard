// DVD: Tilt the DVD under white light (track spacing 740 nm).
import { calc, f2 } from "../kit.js";
const F = f2, E = (x, d = 2) => x.toExponential(d).replace(/e\+?(-?)(\d+)/, (_, s, p) => " \u00d7 10^" + (s ? "\u2212" : "") + p).replace("-", "\u2212"), R = (a) => a[Math.floor(Math.random() * a.length)];
export default function build(ctx) {
  const k = calc(ctx, {
    st: {},
    sliders: [{ key: "a", label: "Viewing angle", min: 20, max: 70, step: 1, value: 45, unit: "\\u00b0", d: 0 }],
    cuts: [
    { id: "try", label: "DVD: tap to explain", tap: (st, c) => { return "Each angle sends a different color to your eye."; } }],
    show: (st) => (() => { const l = 740 * Math.sin(st.a * Math.PI / 180); return `you see ${F(l, 0)} nm` + (l < 400 || l > 700 ? " (not visible)" : ""); })(),
  });
  ctx.art.touchable(["try"]);
  return { destroy() {} };
}
