// Theory vs. observed: Slide the frequency.
import { calc, f2 } from "../kit.js";
const F = f2, E = (x, d = 2) => x.toExponential(d).replace(/e\+?(-?)(\d+)/, (_, s, p) => " \u00d7 10^" + (s ? "\u2212" : "") + p).replace("-", "\u2212"), R = (a) => a[Math.floor(Math.random() * a.length)];
export default function build(ctx) {
  const k = calc(ctx, {
    st: {},
    sliders: [{ key: "f", label: "Frequency", min: 1, max: 30, step: 1, value: 5, unit: "\\u00d7 10\\u00b9\\u2074 Hz", d: 0 }],
    cuts: [
    { id: "try", label: "Graph: tap to explain", tap: (st, c) => { return "Wave theory fails at high frequency: the ultraviolet catastrophe."; } }],
    show: (st) => st.f < 3 ? "wave theory agrees" : "wave theory predicts too much; observed falls off",
  });
  ctx.art.touchable(["try"]);
  return { destroy() {} };
}
