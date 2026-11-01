// Analogy only: bend angle shown proportional to mass (sandbox scale).
import { calc, f2 } from "../kit.js";
const F = f2, E = (x, d = 2) => x.toExponential(d).replace(/e\+?(-?)(\d+)/, (_, s, p) => " \u00d7 10^" + (s ? "\u2212" : "") + p).replace("-", "\u2212"), R = (a) => a[Math.floor(Math.random() * a.length)];
export default function build(ctx) {
  const k = calc(ctx, {
    st: {},
    sliders: [{ key: "M", label: "Ball mass", min: 0, max: 10, step: 1, value: 4, unit: "kg", d: 0 }],
    cuts: [
    { id: "sheet", label: "Sheet: tap to roll a marble", tap: (st, c) => { return st.M === 0 ? "A flat sheet: the marble rolls straight." : st.M > 6 ? "The marble curves in and may circle the ball." : "The marble's path bends toward the ball."; } }],
    show: (st) => `dip depth ${st.M} units, marble bends ${st.M * 4}\u00b0`,
  });
  ctx.art.touchable(["sheet"]);
  return { destroy() {} };
}
