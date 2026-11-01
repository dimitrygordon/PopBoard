// Fog: Use the button to cool humid air toward its dew point (12 \u00b0C).
import { calc, f2 } from "../kit.js";
const F = f2, E = (x, d = 2) => x.toExponential(d).replace(/e\+?(-?)(\d+)/, (_, s, p) => " \u00d7 10^" + (s ? "\u2212" : "") + p).replace("-", "\u2212"), R = (a) => a[Math.floor(Math.random() * a.length)];
export default function build(ctx) {
  const k = calc(ctx, {
    st: { t: 20 },
    sliders: [],
    cuts: [],
    show: (st) => `air: ${st.t} \u00b0C, dew point 12 \u00b0C`,
    box: [300, 600, 1300, 720],
  });
  ctx.ui.button("Cool 2 \\u00b0C", () => { const line = ((st, c) => { st.t = st.t <= 10 ? 20 : st.t - 2; return st.t <= 12 ? "Water vapor condenses into droplets: fog." : ""; })(k.st, k.ctl); k.draw(); if (line) ctx.say(line, true); });
  return { destroy() {} };
}
