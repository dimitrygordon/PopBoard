// L constant; tucked I about 1/3 of stretched (sandbox).
import { calc, f2 } from "../kit.js";
const F = f2, E = (x, d = 2) => x.toExponential(d).replace(/e\+?(-?)(\d+)/, (_, s, p) => " \u00d7 10^" + (s ? "\u2212" : "") + p).replace("-", "\u2212"), R = (a) => a[Math.floor(Math.random() * a.length)];
export default function build(ctx) {
  const k = calc(ctx, {
    st: { t: false },
    sliders: [],
    cuts: [],
    show: (st) => st.t ? "tucked: I small, spins about 3 times faster" : "stretched: I large, spins slowly\nthe CM still follows a parabola",
    box: [300, 600, 1300, 720],
  });
  ctx.ui.button("Tuck or stretch", () => { const line = ((st, c) => { st.t = !st.t; return ""; })(k.st, k.ctl); k.draw(); if (line) ctx.say(line, true); });
  return { destroy() {} };
}
