// Same pulse: area of the whole pulse = 1.5e4 N x 3 ms / 2 = 22.5 N s for a sin^2 pulse (sandbox scale).
import { calc, f2 } from "../kit.js";
const F = f2, E = (x, d = 2) => x.toExponential(d).replace(/e\+?(-?)(\d+)/, (_, s, p) => " \u00d7 10^" + (s ? "\u2212" : "") + p).replace("-", "\u2212"), R = (a) => a[Math.floor(Math.random() * a.length)];
export default function build(ctx) {
  const k = calc(ctx, {
    st: {},
    sliders: [{ key: "t", label: "Shade to", min: 0, max: 3, step: 0.1, value: 1.5, unit: "ms", d: 1 }],
    cuts: [
    { id: "area", label: "Area: tap to shade the whole pulse", tap: (st, c) => { st.t = 3; c.t.set(3); return "The whole area is the impulse on the ball."; } }],
    show: (st) => (() => { const t = st.t / 1000, T = 0.003, I = 1.5e4 * (t / 2 - T / (4 * Math.PI) * Math.sin(2 * Math.PI * t / T)); return `impulse so far = ${F(I, 1)} N\u00b7s`; })(),
  });
  ctx.art.touchable(["area"]);
  return { destroy() {} };
}
