// 0.145 kg ball starting at rest (sandbox).
import { calc, f2 } from "../kit.js";
const F = f2, E = (x, d = 2) => x.toExponential(d).replace(/e\+?(-?)(\d+)/, (_, s, p) => " \u00d7 10^" + (s ? "\u2212" : "") + p).replace("-", "\u2212"), R = (a) => a[Math.floor(Math.random() * a.length)];
export default function build(ctx) {
  const k = calc(ctx, {
    st: { F: 100, t: 0.01 },
    sliders: [],
    cuts: [],
    show: (st) => `F\u0394t = ${st.F} N \u00d7 ${F(st.t, 2)} s = ${F(st.F * st.t, 1)} N\u00b7s = \u0394p\nball (0.145 kg) leaves at ${F(st.F * st.t / 0.145, 1)} m/s`,
    box: [300, 640, 1300, 760],
  });
  ctx.ui.button("Double the force", () => { const line = ((st, c) => { st.F = st.F >= 800 ? 100 : st.F * 2; return ""; })(k.st, k.ctl); k.draw(); if (line) ctx.say(line, true); });
  ctx.ui.button("Double the time", () => { const line = ((st, c) => { st.t = st.t >= 0.08 ? 0.01 : st.t * 2; return ""; })(k.st, k.ctl); k.draw(); if (line) ctx.say(line, true); });
  return { destroy() {} };
}
