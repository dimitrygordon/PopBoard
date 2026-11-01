// Reactor: Raise the rods.
import { calc, f2 } from "../kit.js";
const F = f2, E = (x, d = 2) => x.toExponential(d).replace(/e\+?(-?)(\d+)/, (_, s, p) => " \u00d7 10^" + (s ? "\u2212" : "") + p).replace("-", "\u2212"), R = (a) => a[Math.floor(Math.random() * a.length)];
export default function build(ctx) {
  const k = calc(ctx, {
    st: {},
    sliders: [{ key: "r", label: "Rods out", min: 0, max: 100, step: 5, value: 50, unit: "%", d: 0 }],
    cuts: [
    { id: "try", label: "Reactor: tap to explain", tap: (st, c) => { return "Rods out: more power."; } }],
    show: (st) => `power ${st.r}%`,
  });
  ctx.art.touchable(["try"]);
  return { destroy() {} };
}
