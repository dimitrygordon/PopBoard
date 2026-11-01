// Example Problem 4: 15 kg wheel, r = 0.22 m, I = 1/2 m r^2 = 0.36 kg m^2, 8.0 rev/s in 15 s: alpha = 3.4 rad/s^2, tau = 1.2 N m, F = 5.5 N.
import { calc, f2 } from "../kit.js";
const F = f2, E = (x, d = 2) => x.toExponential(d).replace(/e\+?(-?)(\d+)/, (_, s, p) => " \u00d7 10^" + (s ? "\u2212" : "") + p).replace("-", "\u2212"), R = (a) => a[Math.floor(Math.random() * a.length)];
export default function build(ctx) {
  const k = calc(ctx, {
    st: {},
    sliders: [{ key: "t", label: "Time", min: 5, max: 30, step: 1, value: 15, unit: "s", d: 0 }],
    cuts: [
    { id: "ex4", label: "Ex4: tap to spin it up", tap: (st, c) => { return `In ${st.t} seconds it reaches 16\u03c0 radians per second.`; } }],
    show: (st) => (() => { const a = 16 * Math.PI / st.t, I = 0.5 * 15 * 0.22 ** 2; return `\u03b1 = 16\u03c0/${st.t} = ${F(a, 1)} rad/s\u00b2, I = ${F(I, 2)} kg\u00b7m\u00b2\n\u03c4 = I\u03b1 = ${F(I * a, 1)} N\u00b7m, F = \u03c4/r = ${F(I * a / 0.22, 1)} N`; })(),
  });
  ctx.art.touchable(["ex4"]);
  return { destroy() {} };
}
