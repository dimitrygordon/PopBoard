// Meniscus: Tap to dip the tube in water, then mercury.
import { calc, f2 } from "../kit.js";
const F = f2, E = (x, d = 2) => x.toExponential(d).replace(/e\+?(-?)(\d+)/, (_, s, p) => " \u00d7 10^" + (s ? "\u2212" : "") + p).replace("-", "\u2212"), R = (a) => a[Math.floor(Math.random() * a.length)];
export default function build(ctx) {
  const k = calc(ctx, {
    st: { i: 0 },
    sliders: [],
    cuts: [
    { id: "dip", label: "Meniscus: tap to switch liquids", tap: (st, c) => { st.i = 1 - st.i; return ""; } }],
    show: (st) => st.i ? "mercury: cohesion beats adhesion, surface curves down" : "water: adhesion to glass beats cohesion, surface curves up",
  });
  ctx.art.touchable(["dip"]);
  return { destroy() {} };
}
