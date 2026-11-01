// Geiger: Send particles.
import { calc, f2 } from "../kit.js";
const F = f2, E = (x, d = 2) => x.toExponential(d).replace(/e\+?(-?)(\d+)/, (_, s, p) => " \u00d7 10^" + (s ? "\u2212" : "") + p).replace("-", "\u2212"), R = (a) => a[Math.floor(Math.random() * a.length)];
export default function build(ctx) {
  const k = calc(ctx, {
    st: {},
    sliders: [{ key: "n", label: "Particles", min: 0, max: 20, step: 1, value: 5, unit: "", d: 0 }],
    cuts: [
    { id: "try", label: "Tube: tap to explain", tap: (st, c) => { return "Each starts an avalanche."; } }],
    show: (st) => `${st.n} clicks`,
  });
  ctx.art.touchable(["try"]);
  return { destroy() {} };
}
