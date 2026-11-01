// Gold foil: Fire more alpha particles.
import { calc, f2 } from "../kit.js";
const F = f2, E = (x, d = 2) => x.toExponential(d).replace(/e\+?(-?)(\d+)/, (_, s, p) => " \u00d7 10^" + (s ? "\u2212" : "") + p).replace("-", "\u2212"), R = (a) => a[Math.floor(Math.random() * a.length)];
export default function build(ctx) {
  const k = calc(ctx, {
    st: {},
    sliders: [{ key: "n", label: "Alphas", min: 0, max: 1000, step: 100, value: 100, unit: "", d: 0 }],
    cuts: [
    { id: "try", label: "Screen: tap to explain", tap: (st, c) => { return "Most go straight through."; } }],
    show: (st) => `${st.n} flashes, nearly all straight ahead`,
  });
  ctx.art.touchable(["try"]);
  return { destroy() {} };
}
