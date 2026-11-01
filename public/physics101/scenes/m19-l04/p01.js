// Breaker: Turn on 1500 W appliances on a 120 V, 20 A breaker.
import { calc, f2 } from "../kit.js";
const F = f2, E = (x, d = 2) => x.toExponential(d).replace(/e\+?(-?)(\d+)/, (_, s, p) => " \u00d7 10^" + (s ? "\u2212" : "") + p).replace("-", "\u2212"), R = (a) => a[Math.floor(Math.random() * a.length)];
export default function build(ctx) {
  const k = calc(ctx, {
    st: {},
    sliders: [{ key: "n", label: "Appliances", min: 0, max: 3, step: 1, value: 1, unit: "", d: 0 }],
    cuts: [
    { id: "try", label: "Breaker: tap to explain", tap: (st, c) => { return "Current heats the bimetallic strip until it trips."; } }],
    show: (st) => `I = ${F(st.n * 12.5, 1)} A` + (st.n * 12.5 > 20 ? "\nbreaker trips" : ""),
  });
  ctx.art.touchable(["try"]);
  return { destroy() {} };
}
