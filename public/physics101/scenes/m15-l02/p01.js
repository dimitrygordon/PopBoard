// Gap: Shrink the gap that 550 nm light passes through.
import { calc, f2 } from "../kit.js";
const F = f2, E = (x, d = 2) => x.toExponential(d).replace(/e\+?(-?)(\d+)/, (_, s, p) => " \u00d7 10^" + (s ? "\u2212" : "") + p).replace("-", "\u2212"), R = (a) => a[Math.floor(Math.random() * a.length)];
export default function build(ctx) {
  const k = calc(ctx, {
    st: {},
    sliders: [{ key: "w", label: "Gap width", min: 0.5, max: 100, step: 0.5, value: 50, unit: "\\u00b5m", d: 1 }],
    cuts: [
    { id: "gap", label: "Spreading: tap to explain", tap: (st, c) => { return "Narrower gap, more spreading and fringes."; } }],
    show: (st) => `spread angle \u2248 \u03bb/w = ${F(0.55 / st.w * 180 / Math.PI, 1)}\u00b0`,
  });
  ctx.art.touchable(["gap"]);
  return { destroy() {} };
}
