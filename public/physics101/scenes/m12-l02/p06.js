// Evaporation: Use the button to let the fastest particles escape and watch the liquid cool.
import { calc, f2 } from "../kit.js";
const F = f2, E = (x, d = 2) => x.toExponential(d).replace(/e\+?(-?)(\d+)/, (_, s, p) => " \u00d7 10^" + (s ? "\u2212" : "") + p).replace("-", "\u2212"), R = (a) => a[Math.floor(Math.random() * a.length)];
export default function build(ctx) {
  const k = calc(ctx, {
    st: { t: 30 },
    sliders: [],
    cuts: [],
    show: (st) => `liquid temperature: ${st.t} \u00b0C`,
    box: [300, 600, 1300, 720],
  });
  ctx.ui.button("Let some evaporate", () => { const line = ((st, c) => { st.t = st.t <= 22 ? 30 : st.t - 2; return "The fastest particles leave, so the average drops."; })(k.st, k.ctl); k.draw(); if (line) ctx.say(line, true); });
  return { destroy() {} };
}
