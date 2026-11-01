// Efficiency: Use the button to change the work an engine gets from 1000 J of input heat.
import { calc, f2 } from "../kit.js";
const F = f2, E = (x, d = 2) => x.toExponential(d).replace(/e\+?(-?)(\d+)/, (_, s, p) => " \u00d7 10^" + (s ? "\u2212" : "") + p).replace("-", "\u2212"), R = (a) => a[Math.floor(Math.random() * a.length)];
export default function build(ctx) {
  const k = calc(ctx, {
    st: { w: 250 },
    sliders: [],
    cuts: [],
    show: (st) => `efficiency = W / Q_H = ${st.w} / 1000 = ${st.w / 10}%\nwaste heat = ${1000 - st.w} J`,
    box: [300, 600, 1300, 720],
  });
  ctx.ui.button("More work", () => { const line = ((st, c) => { st.w = st.w >= 500 ? 100 : st.w + 50; return "Real engines can never reach 100%."; })(k.st, k.ctl); k.draw(); if (line) ctx.say(line, true); });
  return { destroy() {} };
}
