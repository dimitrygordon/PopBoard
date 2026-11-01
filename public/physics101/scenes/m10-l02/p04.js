// KE_rot = 1/2 I omega^2 with I = 1/2 m r^2 = 0.090.
import { calc, f2 } from "../kit.js";
const F = f2, E = (x, d = 2) => x.toExponential(d).replace(/e\+?(-?)(\d+)/, (_, s, p) => " \u00d7 10^" + (s ? "\u2212" : "") + p).replace("-", "\u2212"), R = (a) => a[Math.floor(Math.random() * a.length)];
export default function build(ctx) {
  const k = calc(ctx, {
    st: { w: 5 },
    sliders: [],
    cuts: [],
    show: (st) => `KE_rot = \u00bdI\u03c9\u00b2 = \u00bd \u00d7 0.090 \u00d7 ${st.w}\u00b2 = ${F(0.045 * st.w ** 2, 1)} J`,
    box: [300, 600, 1300, 720],
  });
  ctx.ui.button("Double the spin", () => { const line = ((st, c) => { st.w = st.w >= 40 ? 5 : st.w * 2; return ""; })(k.st, k.ctl); k.draw(); if (line) ctx.say(line, true); });
  return { destroy() {} };
}
