// Example Problem 2: L_i = 7.9 kg m^2/s, impulse -7.9, tau = -2.6 N m.
import { calc, f2 } from "../kit.js";
const F = f2, E = (x, d = 2) => x.toExponential(d).replace(/e\+?(-?)(\d+)/, (_, s, p) => " \u00d7 10^" + (s ? "\u2212" : "") + p).replace("-", "\u2212"), R = (a) => a[Math.floor(Math.random() * a.length)];
export default function build(ctx) {
  const k = calc(ctx, {
    st: {},
    sliders: [{ key: "t", label: "Time", min: 0, max: 3, step: 0.25, value: 0, unit: "s", d: 2 }],
    cuts: [
    { id: "ex2", label: "Ex2: tap to jump to the end", tap: (st, c) => { st.t = 3; c.t.set(3); return "Angular impulse \u22127.9 kg\u00b7m\u00b2/s; average torque \u22122.6 N\u00b7m."; } }],
    show: (st) => `L = ${F(7.85 * (1 - st.t / 3), 1)} kg\u00b7m\u00b2/s (started at 7.9)\n\u03c4_avg = \u22127.9 / 3.0 = \u22122.6 N\u00b7m`,
  });
  ctx.art.touchable(["ex2"]);
  return { destroy() {} };
}
