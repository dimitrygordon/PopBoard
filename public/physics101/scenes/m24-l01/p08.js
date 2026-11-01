// Strong force: Push the protons together.
import { calc, f2 } from "../kit.js";
const F = f2, E = (x, d = 2) => x.toExponential(d).replace(/e\+?(-?)(\d+)/, (_, s, p) => " \u00d7 10^" + (s ? "\u2212" : "") + p).replace("-", "\u2212"), R = (a) => a[Math.floor(Math.random() * a.length)];
export default function build(ctx) {
  const k = calc(ctx, {
    st: {},
    sliders: [{ key: "r", label: "Separation", min: 0.5, max: 5, step: 0.1, value: 3, unit: "fm", d: 1 }],
    cuts: [
    { id: "try", label: "Protons: tap to explain", tap: (st, c) => { return "Close enough, the strong force wins."; } }],
    show: (st) => st.r <= 1.5 ? "strong force wins: bound" : "electric repulsion wins",
  });
  ctx.art.touchable(["try"]);
  return { destroy() {} };
}
