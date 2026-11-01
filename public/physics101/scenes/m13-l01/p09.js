// Swing: Push a swing (period 2.0 s) at different time intervals.
import { calc, f2 } from "../kit.js";
const F = f2, E = (x, d = 2) => x.toExponential(d).replace(/e\+?(-?)(\d+)/, (_, s, p) => " \u00d7 10^" + (s ? "\u2212" : "") + p).replace("-", "\u2212"), R = (a) => a[Math.floor(Math.random() * a.length)];
export default function build(ctx) {
  const k = calc(ctx, {
    st: {},
    sliders: [{ key: "t", label: "Time between pushes", min: 1, max: 3, step: 0.1, value: 2, unit: "s", d: 1 }],
    cuts: [
    { id: "push", label: "Height: tap to push", tap: (st, c) => { return Math.abs(st.t - 2) < 0.05 ? "In step with the period: resonance, it goes higher." : "Out of step: the pushes fight the swing."; } }],
    show: (st) => Math.abs(st.t - 2) < 0.05 ? "resonance: amplitude grows" : "amplitude stays small",
  });
  ctx.art.touchable(["push"]);
  return { destroy() {} };
}
