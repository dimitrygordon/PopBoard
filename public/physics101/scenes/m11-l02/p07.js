// First law: Use the button to change the heat added. The gas does 200 J of work.
import { calc, f2 } from "../kit.js";
const F = f2, E = (x, d = 2) => x.toExponential(d).replace(/e\+?(-?)(\d+)/, (_, s, p) => " \u00d7 10^" + (s ? "\u2212" : "") + p).replace("-", "\u2212"), R = (a) => a[Math.floor(Math.random() * a.length)];
export default function build(ctx) {
  const k = calc(ctx, {
    st: { q: 500 },
    sliders: [],
    cuts: [],
    show: (st) => `\u0394U = Q \u2212 W = ${st.q} \u2212 200 = ${st.q - 200} J`,
    box: [300, 600, 1300, 720],
  });
  ctx.ui.button("Add 100 J of heat", () => { const line = ((st, c) => { st.q = st.q >= 1000 ? 0 : st.q + 100; return ""; })(k.st, k.ctl); k.draw(); if (line) ctx.say(line, true); });
  return { destroy() {} };
}
