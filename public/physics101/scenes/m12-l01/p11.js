// Expansion: Use the button to heat air in a room and watch it rise.
import { calc, f2 } from "../kit.js";
const F = f2, E = (x, d = 2) => x.toExponential(d).replace(/e\+?(-?)(\d+)/, (_, s, p) => " \u00d7 10^" + (s ? "\u2212" : "") + p).replace("-", "\u2212"), R = (a) => a[Math.floor(Math.random() * a.length)];
export default function build(ctx) {
  const k = calc(ctx, {
    st: { t: 20 },
    sliders: [],
    cuts: [],
    show: (st) => `air at ${st.t} \u00b0C: density ${F(1.204 * 293 / (st.t + 273), 3)} kg/m\u00b3`,
    box: [300, 600, 1300, 720],
  });
  ctx.ui.button("Heat by 20 \\u00b0C", () => { const line = ((st, c) => { st.t = st.t >= 80 ? 20 : st.t + 20; return "Less dense warm air rises: convection."; })(k.st, k.ctl); k.draw(); if (line) ctx.say(line, true); });
  return { destroy() {} };
}
