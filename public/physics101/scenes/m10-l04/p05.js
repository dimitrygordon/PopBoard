// Efficiency: Use the button to add friction to a machine with IMA 4.0.
import { calc, f2 } from "../kit.js";
const F = f2, E = (x, d = 2) => x.toExponential(d).replace(/e\+?(-?)(\d+)/, (_, s, p) => " \u00d7 10^" + (s ? "\u2212" : "") + p).replace("-", "\u2212"), R = (a) => a[Math.floor(Math.random() * a.length)];
export default function build(ctx) {
  const k = calc(ctx, {
    st: { MA: 4 },
    sliders: [],
    cuts: [],
    show: (st) => `MA = ${F(st.MA, 1)}, IMA = 4.0\ne = MA/IMA \u00d7 100 = ${F(st.MA / 4 * 100, 0)}%`,
    box: [300, 600, 1300, 720],
  });
  ctx.ui.button("Add friction", () => { const line = ((st, c) => { st.MA = st.MA <= 2 ? 4 : st.MA - 0.5; return ""; })(k.st, k.ctl); k.draw(); if (line) ctx.say(line, true); });
  return { destroy() {} };
}
