// Engine cycle: Use the button to step through a heat engine cycle.
import { calc, f2 } from "../kit.js";
const F = f2, E = (x, d = 2) => x.toExponential(d).replace(/e\+?(-?)(\d+)/, (_, s, p) => " \u00d7 10^" + (s ? "\u2212" : "") + p).replace("-", "\u2212"), R = (a) => a[Math.floor(Math.random() * a.length)];
export default function build(ctx) {
  const k = calc(ctx, {
    st: { i: 0, N: ["take in heat Q_H from the hot reservoir", "do work W", "release waste heat Q_L to the cold reservoir", "repeat: W = Q_H \u2212 Q_L"] },
    sliders: [],
    cuts: [],
    show: (st) => st.N[st.i],
    box: [300, 600, 1300, 720],
  });
  ctx.ui.button("Next step", () => { const line = ((st, c) => { st.i = (st.i + 1) % 4; return ""; })(k.st, k.ctl); k.draw(); if (line) ctx.say(line, true); });
  return { destroy() {} };
}
