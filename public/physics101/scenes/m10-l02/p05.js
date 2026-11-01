// Stored energy: Use the buttons to raise a 1.0 kg book or squeeze a spring and see the stored energy.
import { calc, f2 } from "../kit.js";
const F = f2, E = (x, d = 2) => x.toExponential(d).replace(/e\+?(-?)(\d+)/, (_, s, p) => " \u00d7 10^" + (s ? "\u2212" : "") + p).replace("-", "\u2212"), R = (a) => a[Math.floor(Math.random() * a.length)];
export default function build(ctx) {
  const k = calc(ctx, {
    st: { h: 0, x: 0 },
    sliders: [],
    cuts: [],
    show: (st) => `book: GPE = mgh = ${F(9.8 * st.h, 1)} J\nspring (k = 500 N/m): EPE = \u00bdkx\u00b2 = ${F(250 * st.x ** 2, 2)} J`,
    box: [300, 600, 1300, 760],
  });
  ctx.ui.button("Raise the book 0.5 m", () => { const line = ((st, c) => { st.h = st.h >= 2 ? 0 : st.h + 0.5; return ""; })(k.st, k.ctl); k.draw(); if (line) ctx.say(line, true); });
  ctx.ui.button("Squeeze the spring 2 cm", () => { const line = ((st, c) => { st.x = st.x >= 0.1 ? 0 : st.x + 0.02; return ""; })(k.st, k.ctl); k.draw(); if (line) ctx.say(line, true); });
  return { destroy() {} };
}
