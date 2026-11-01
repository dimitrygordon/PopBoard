// Energy bank: Use the buttons to deposit or withdraw work in the energy bank.
import { calc, f2 } from "../kit.js";
const F = f2, E = (x, d = 2) => x.toExponential(d).replace(/e\+?(-?)(\d+)/, (_, s, p) => " \u00d7 10^" + (s ? "\u2212" : "") + p).replace("-", "\u2212"), R = (a) => a[Math.floor(Math.random() * a.length)];
export default function build(ctx) {
  const k = calc(ctx, {
    st: { K: 10 },
    sliders: [],
    cuts: [],
    show: (st) => `kinetic energy balance: ${st.K} J`,
    box: [300, 600, 1300, 720],
  });
  ctx.ui.button("Deposit 5 J (positive work)", () => { const line = ((st, c) => { st.K += 5; return ""; })(k.st, k.ctl); k.draw(); if (line) ctx.say(line, true); });
  ctx.ui.button("Withdraw 5 J (negative work)", () => { const line = ((st, c) => { st.K = Math.max(0, st.K - 5); return st.K ? "" : "The account is empty: the object is at rest."; })(k.st, k.ctl); k.draw(); if (line) ctx.say(line, true); });
  return { destroy() {} };
}
