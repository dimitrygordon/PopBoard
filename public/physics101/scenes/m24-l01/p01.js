// Gold atom: Fire more alpha particles.
import { calc, f2 } from "../kit.js";
const F = f2, E = (x, d = 2) => x.toExponential(d).replace(/e\+?(-?)(\d+)/, (_, s, p) => " \u00d7 10^" + (s ? "\u2212" : "") + p).replace("-", "\u2212"), R = (a) => a[Math.floor(Math.random() * a.length)];
export default function build(ctx) {
  const k = calc(ctx, {
    st: {},
    sliders: [{ key: "n", label: "Alphas", min: 0, max: 10000, step: 1000, value: 2000, unit: "", d: 0 }],
    cuts: [
    { id: "try", label: "Atom: tap to explain", tap: (st, c) => { return "Only a tiny dense center bounces them back."; } }],
    show: (st) => `bounced back: ${Math.round(st.n / 2000)}`,
  });
  ctx.art.touchable(["try"]);
  return { destroy() {} };
}
