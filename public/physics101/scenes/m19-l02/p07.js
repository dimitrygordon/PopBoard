// Example Problem 3: 1.44 kW, 14.4 kJ in 10.0 s.
import { calc, f2 } from "../kit.js";
const F = f2, E = (x, d = 2) => x.toExponential(d).replace(/e\+?(-?)(\d+)/, (_, s, p) => " \u00d7 10^" + (s ? "\u2212" : "") + p).replace("-", "\u2212"), R = (a) => a[Math.floor(Math.random() * a.length)];
export default function build(ctx) {
  const k = calc(ctx, {
    st: {},
    sliders: [{ key: "t", label: "Time", min: 0, max: 30, step: 1, value: 10, unit: "s", d: 0 }],
    cuts: [
    { id: "try", label: "Meter: tap for the book's 10.0 s", tap: (st, c) => { st.t = 10; c.t.set(10); return "P = 1.44 kW, E = 14.4 kJ."; } }],
    show: (st) => `P = \u0394V\u00b2/R = 1.44 kW\nE = ${F(1.44 * st.t, 1)} kJ`,
  });
  ctx.art.touchable(["try"]);
  return { destroy() {} };
}
