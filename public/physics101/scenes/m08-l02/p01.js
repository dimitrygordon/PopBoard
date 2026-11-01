// Sandbox top: string radius 1.0 cm, I = 2.0e-5 kg m^2, pull for 0.50 s. omega = (F r / I) t.
import { calc, f2 } from "../kit.js";
const F = f2, E = (x, d = 2) => x.toExponential(d).replace(/e\+?(-?)(\d+)/, (_, s, p) => " \u00d7 10^" + (s ? "\u2212" : "") + p).replace("-", "\u2212"), R = (a) => a[Math.floor(Math.random() * a.length)];
export default function build(ctx) {
  const k = calc(ctx, {
    st: {},
    sliders: [{ key: "F", label: "Pull", min: 0.5, max: 5, step: 0.5, value: 2, unit: "N", d: 1 }],
    cuts: [
    { id: "top", label: "Top: tap to pull the string", tap: (st, c) => { return `It spins at ${F(st.F * 0.01 / 2e-5 * 0.5, 0)} radians per second.`; } }],
    show: (st) => `\u03c4 = F r = ${F(st.F * 0.01, 3)} N\u00b7m\n\u03c9 after 0.50 s = ${F(st.F * 0.01 / 2e-5 * 0.5, 0)} rad/s`,
  });
  ctx.art.touchable(["top"]);
  return { destroy() {} };
}
