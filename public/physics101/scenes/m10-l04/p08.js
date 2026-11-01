// Bicycle chain: Use the button to walk through the bike as a compound machine.
import { calc, f2 } from "../kit.js";
const F = f2, E = (x, d = 2) => x.toExponential(d).replace(/e\+?(-?)(\d+)/, (_, s, p) => " \u00d7 10^" + (s ? "\u2212" : "") + p).replace("-", "\u2212"), R = (a) => a[Math.floor(Math.random() * a.length)];
export default function build(ctx) {
  const k = calc(ctx, {
    st: { i: 0, N: ["pedal and front gear: a wheel and axle", "the chain links the front gear to the rear gear", "rear gear and wheel: a wheel and axle", "MA = MA_front \u00d7 MA_rear"] },
    sliders: [],
    cuts: [],
    show: (st) => `step ${st.i + 1}: ${st.N[st.i]}`,
    box: [300, 600, 1300, 720],
  });
  ctx.ui.button("Next step", () => { const line = ((st, c) => { st.i = (st.i + 1) % 4; return ""; })(k.st, k.ctl); k.draw(); if (line) ctx.say(line, true); });
  return { destroy() {} };
}
