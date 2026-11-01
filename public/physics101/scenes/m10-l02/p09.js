// Example Problem 4: 7.30 kg, rack 0.610 m, shoulder 1.12 m: 80 J (floor), 36 J (rack); gravity's work -36 J.
import { calc, f2 } from "../kit.js";
const F = f2, E = (x, d = 2) => x.toExponential(d).replace(/e\+?(-?)(\d+)/, (_, s, p) => " \u00d7 10^" + (s ? "\u2212" : "") + p).replace("-", "\u2212"), R = (a) => a[Math.floor(Math.random() * a.length)];
export default function build(ctx) {
  const k = calc(ctx, {
    st: { r: false },
    sliders: [],
    cuts: [
    { id: "ex4", label: "Ex4: tap to switch the reference", tap: (st, c) => { st.r = !st.r; return "Either way, gravity does \u221236 J of work during the lift."; } }],
    show: (st) => st.r ? "reference: rack. GPE = 7.30 \u00d7 9.8 \u00d7 0.51 = 36 J" : "reference: floor. GPE = 7.30 \u00d7 9.8 \u00d7 1.12 = 80 J",
  });
  ctx.art.touchable(["ex4"]);
  return { destroy() {} };
}
