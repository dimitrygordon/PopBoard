// Lift time: Set how long it takes to lift a 500 N load 2.0 m. Same work, different power.
import { calc, f2 } from "../kit.js";
const F = f2, E = (x, d = 2) => x.toExponential(d).replace(/e\+?(-?)(\d+)/, (_, s, p) => " \u00d7 10^" + (s ? "\u2212" : "") + p).replace("-", "\u2212"), R = (a) => a[Math.floor(Math.random() * a.length)];
export default function build(ctx) {
  const k = calc(ctx, {
    st: {},
    sliders: [{ key: "t", label: "Time", min: 0.5, max: 10, step: 0.5, value: 2, unit: "s", d: 1 }],
    cuts: [
    { id: "lift", label: "Lift: tap to lift twice as fast", tap: (st, c) => { st.t = Math.max(0.5, st.t / 2); c.t.set(st.t); return "Same work in half the time: twice the power."; } }],
    show: (st) => `W = 1000 J, P = W/t = ${F(1000 / st.t, 0)} W`,
  });
  ctx.art.touchable(["lift"]);
  return { destroy() {} };
}
