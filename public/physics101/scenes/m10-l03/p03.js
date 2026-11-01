// Falling bowling ball: Use the button to drop the 7.30 kg ball 0.5 m at a time from 2.0 m. ME stays fixed.
import { calc, f2 } from "../kit.js";
const F = f2, E = (x, d = 2) => x.toExponential(d).replace(/e\+?(-?)(\d+)/, (_, s, p) => " \u00d7 10^" + (s ? "\u2212" : "") + p).replace("-", "\u2212"), R = (a) => a[Math.floor(Math.random() * a.length)];
export default function build(ctx) {
  const k = calc(ctx, {
    st: { h: 2 },
    sliders: [],
    cuts: [],
    show: (st) => `GPE = ${F(7.3 * 9.8 * st.h, 0)} J, KE = ${F(7.3 * 9.8 * (2 - st.h), 0)} J\nME = ${F(7.3 * 9.8 * 2, 0)} J`,
    box: [300, 600, 1300, 720],
  });
  ctx.ui.button("Drop 0.5 m", () => { const line = ((st, c) => { st.h = st.h <= 0 ? 2 : st.h - 0.5; return st.h === 0 ? "All the GPE is now KE." : ""; })(k.st, k.ctl); k.draw(); if (line) ctx.say(line, true); });
  return { destroy() {} };
}
