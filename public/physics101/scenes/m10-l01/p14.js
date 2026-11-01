// Example Problem 3: 15.0 s: 7.20 kW.
import { calc, f2 } from "../kit.js";
const F = f2, E = (x, d = 2) => x.toExponential(d).replace(/e\+?(-?)(\d+)/, (_, s, p) => " \u00d7 10^" + (s ? "\u2212" : "") + p).replace("-", "\u2212"), R = (a) => a[Math.floor(Math.random() * a.length)];
export default function build(ctx) {
  const k = calc(ctx, {
    st: {},
    sliders: [{ key: "t", label: "Lift time", min: 5, max: 30, step: 0.5, value: 15, unit: "s", d: 1 }],
    cuts: [
    { id: "ex3", label: "Ex3: tap for the book's 15.0 s", tap: (st, c) => { st.t = 15; c.t.set(15); return "7.20 kW."; } }],
    show: (st) => `P = Fd/t = 1.20 \u00d7 10^4 \u00d7 9.00 / ${F(st.t, 1)} = ${F(108 / st.t, 2)} kW`,
  });
  ctx.art.touchable(["ex3"]);
  return { destroy() {} };
}
