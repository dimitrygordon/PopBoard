// Refrigerator: Use the button to change the work input. Heat dumped outside = heat removed + work.
import { calc, f2 } from "../kit.js";
const F = f2, E = (x, d = 2) => x.toExponential(d).replace(/e\+?(-?)(\d+)/, (_, s, p) => " \u00d7 10^" + (s ? "\u2212" : "") + p).replace("-", "\u2212"), R = (a) => a[Math.floor(Math.random() * a.length)];
export default function build(ctx) {
  const k = calc(ctx, {
    st: { w: 100 },
    sliders: [],
    cuts: [],
    show: (st) => `removed from inside: 400 J\nwork in: ${st.w} J\nreleased outside: ${400 + st.w} J`,
    box: [300, 600, 1300, 720],
  });
  ctx.ui.button("More work", () => { const line = ((st, c) => { st.w = st.w >= 300 ? 100 : st.w + 50; return ""; })(k.st, k.ctl); k.draw(); if (line) ctx.say(line, true); });
  return { destroy() {} };
}
