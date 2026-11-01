// Plasma: Use the button to heat a gas until it becomes plasma.
import { calc, f2 } from "../kit.js";
const F = f2, E = (x, d = 2) => x.toExponential(d).replace(/e\+?(-?)(\d+)/, (_, s, p) => " \u00d7 10^" + (s ? "\u2212" : "") + p).replace("-", "\u2212"), R = (a) => a[Math.floor(Math.random() * a.length)];
export default function build(ctx) {
  const k = calc(ctx, {
    st: { i: 0, N: ["neutral gas atoms", "very hot: electrons knocked loose", "plasma: free electrons and positive ions; it conducts electricity"] },
    sliders: [],
    cuts: [],
    show: (st) => st.N[st.i],
    box: [300, 600, 1300, 720],
  });
  ctx.ui.button("Heat it", () => { const line = ((st, c) => { st.i = (st.i + 1) % 3; return ""; })(k.st, k.ctl); k.draw(); if (line) ctx.say(line, true); });
  return { destroy() {} };
}
