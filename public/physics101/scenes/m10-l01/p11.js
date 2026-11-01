// Work-energy theorem: Use the buttons to do positive or negative work on a 2.0 kg cart moving at 3.0 m/s.
import { calc, f2 } from "../kit.js";
const F = f2, E = (x, d = 2) => x.toExponential(d).replace(/e\+?(-?)(\d+)/, (_, s, p) => " \u00d7 10^" + (s ? "\u2212" : "") + p).replace("-", "\u2212"), R = (a) => a[Math.floor(Math.random() * a.length)];
export default function build(ctx) {
  const k = calc(ctx, {
    st: { W: 0 },
    sliders: [],
    cuts: [],
    show: (st) => `KE = 9.0 J + (${st.W}) J = ${9 + st.W} J\nv = ${F(Math.sqrt(9 + st.W), 2)} m/s`,
    box: [300, 600, 1300, 720],
  });
  ctx.ui.button("Do +4 J of work", () => { const line = ((st, c) => { st.W = Math.min(st.W + 4, 40); return ""; })(k.st, k.ctl); k.draw(); if (line) ctx.say(line, true); });
  ctx.ui.button("Do \\u22124 J of work", () => { const line = ((st, c) => { st.W = Math.max(st.W - 4, -9); return st.W === -9 ? "All 9 J of kinetic energy is gone: the cart stops." : ""; })(k.st, k.ctl); k.draw(); if (line) ctx.say(line, true); });
  return { destroy() {} };
}
