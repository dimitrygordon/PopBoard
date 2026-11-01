// Bounce back: Fire thousands.
import { calc, f2 } from "../kit.js";
const F = f2, E = (x, d = 2) => x.toExponential(d).replace(/e\+?(-?)(\d+)/, (_, s, p) => " \u00d7 10^" + (s ? "\u2212" : "") + p).replace("-", "\u2212"), R = (a) => a[Math.floor(Math.random() * a.length)];
export default function build(ctx) {
  const k = calc(ctx, {
    st: {},
    sliders: [{ key: "n", label: "Alphas", min: 0, max: 20000, step: 1000, value: 8000, unit: "", d: 0 }],
    cuts: [
    { id: "try", label: "Foil: tap to explain", tap: (st, c) => { return "A tiny, dense, positive nucleus."; } }],
    show: (st) => `bounced back: about ${Math.round(st.n / 8000)}`,
  });
  ctx.art.touchable(["try"]);
  return { destroy() {} };
}
