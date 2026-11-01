// Table 2: hoop I = m r^2, solid disk (cylinder) I = 1/2 m r^2, solid sphere 2/5 m r^2. m = 1.0 kg, r = 0.20 m.
import { calc, f2 } from "../kit.js";
const F = f2, E = (x, d = 2) => x.toExponential(d).replace(/e\+?(-?)(\d+)/, (_, s, p) => " \u00d7 10^" + (s ? "\u2212" : "") + p).replace("-", "\u2212"), R = (a) => a[Math.floor(Math.random() * a.length)];
export default function build(ctx) {
  const k = calc(ctx, {
    st: { i: 0, N: ["thin hoop", "solid disk", "solid sphere"], k: [1, 0.5, 0.4] },
    sliders: [],
    cuts: [],
    show: (st) => `${st.N[st.i]}, 1.0 kg, r = 0.20 m\nI = ${st.k[st.i]} mr\u00b2 = ${F(st.k[st.i] * 0.04, 3)} kg\u00b7m\u00b2`,
    box: [300, 600, 1300, 720],
  });
  ctx.ui.button("Next shape", () => { const line = ((st, c) => { st.i = (st.i + 1) % 3; return "The farther the mass sits from the axis, the bigger I."; })(k.st, k.ctl); k.draw(); if (line) ctx.say(line, true); });
  return { destroy() {} };
}
