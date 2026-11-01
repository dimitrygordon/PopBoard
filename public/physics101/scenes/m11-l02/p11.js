// Spreading out: Use the button to let a hot spot spread through a cool block.
import { calc, f2 } from "../kit.js";
const F = f2, E = (x, d = 2) => x.toExponential(d).replace(/e\+?(-?)(\d+)/, (_, s, p) => " \u00d7 10^" + (s ? "\u2212" : "") + p).replace("-", "\u2212"), R = (a) => a[Math.floor(Math.random() * a.length)];
export default function build(ctx) {
  const k = calc(ctx, {
    st: { s: 0 },
    sliders: [],
    cuts: [],
    show: (st) => `hot spot: ${80 - st.s * 12} \u00b0C, edges: ${20 + st.s * 3} \u00b0C`,
    box: [300, 600, 1300, 720],
  });
  ctx.ui.button("Wait", () => { const line = ((st, c) => { st.s = st.s >= 4 ? 0 : st.s + 1; return st.s === 4 ? "Uniform: it never un-spreads on its own." : ""; })(k.st, k.ctl); k.draw(); if (line) ctx.say(line, true); });
  return { destroy() {} };
}
