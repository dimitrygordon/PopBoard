// L = 3.0 kg m^2/s (sandbox); I 1.5 arms out, 0.60 arms in.
import { calc, f2 } from "../kit.js";
const F = f2, E = (x, d = 2) => x.toExponential(d).replace(/e\+?(-?)(\d+)/, (_, s, p) => " \u00d7 10^" + (s ? "\u2212" : "") + p).replace("-", "\u2212"), R = (a) => a[Math.floor(Math.random() * a.length)];
export default function build(ctx) {
  const k = calc(ctx, {
    st: { i: false },
    sliders: [],
    cuts: [],
    show: (st) => `I = ${st.i ? "0.60" : "1.5"} kg\u00b7m\u00b2, \u03c9 = ${st.i ? "5.0" : "2.0"} rad/s\nL = 3.0 kg\u00b7m\u00b2/s (unchanged)`,
    box: [300, 600, 1300, 720],
  });
  ctx.ui.button("Arms in or out", () => { const line = ((st, c) => { st.i = !st.i; return st.i ? "Smaller I, bigger \u03c9." : ""; })(k.st, k.ctl); k.draw(); if (line) ctx.say(line, true); });
  return { destroy() {} };
}
