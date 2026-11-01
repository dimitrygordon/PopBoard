// Collision types: Use the button to compare kinds of collision for two 1.0 kg carts, one at 2.0 m/s.
import { calc, f2 } from "../kit.js";
const F = f2, E = (x, d = 2) => x.toExponential(d).replace(/e\+?(-?)(\d+)/, (_, s, p) => " \u00d7 10^" + (s ? "\u2212" : "") + p).replace("-", "\u2212"), R = (a) => a[Math.floor(Math.random() * a.length)];
export default function build(ctx) {
  const k = calc(ctx, {
    st: { i: 0, N: ["elastic", "inelastic", "perfectly inelastic (stick)"], K: [2, 1.5, 1] },
    sliders: [],
    cuts: [],
    show: (st) => `${st.N[st.i]}: momentum 2.0 kg\u00b7m/s before and after\nKE 2.0 J before, ${F(st.K[st.i], 1)} J after`,
    box: [300, 600, 1300, 720],
  });
  ctx.ui.button("Next collision type", () => { const line = ((st, c) => { st.i = (st.i + 1) % 3; return "Momentum is conserved every time."; })(k.st, k.ctl); k.draw(); if (line) ctx.say(line, true); });
  return { destroy() {} };
}
