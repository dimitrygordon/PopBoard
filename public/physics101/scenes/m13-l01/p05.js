// PE and KE: Release a mass on a 100 N/m horizontal spring from 0.20 m and slide the position.
import { calc, f2 } from "../kit.js";
const F = f2, E = (x, d = 2) => x.toExponential(d).replace(/e\+?(-?)(\d+)/, (_, s, p) => " \u00d7 10^" + (s ? "\u2212" : "") + p).replace("-", "\u2212"), R = (a) => a[Math.floor(Math.random() * a.length)];
export default function build(ctx) {
  const k = calc(ctx, {
    st: {},
    sliders: [{ key: "x", label: "Position", min: -0.2, max: 0.2, step: 0.01, value: 0.2, unit: "m", d: 2 }],
    cuts: [
    { id: "slide", label: "PE and KE: tap to explain", tap: (st, c) => { return "The total stays 2.0 J."; } }],
    show: (st) => `PE = \u00bdkx\u00b2 = ${F(50 * st.x * st.x, 2)} J\nKE = ${F(2 - 50 * st.x * st.x, 2)} J`,
  });
  ctx.art.touchable(["slide"]);
  return { destroy() {} };
}
